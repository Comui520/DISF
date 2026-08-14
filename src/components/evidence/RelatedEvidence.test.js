// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import RelatedEvidence from './RelatedEvidence.vue'

const items = [
  {
    id: 'one',
    title: '相邻层热力图',
    path: 'related/layer-9.png',
    isImage: true,
  },
  {
    id: 'two',
    title: '参数记录',
    path: 'related/params.json',
  },
]

describe('RelatedEvidence', () => {
  it('renders nothing when there is no related evidence', () => {
    const wrapper = mount(RelatedEvidence, {
      props: { items: [], urlFor: () => '' },
    })

    expect(wrapper.find('[data-testid="related-evidence"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('opens compact evidence items with pointer and keyboard input', async () => {
    const wrapper = mount(RelatedEvidence, {
      props: {
        items,
        urlFor: (item) => `/related/${item.id}`,
      },
    })
    const cards = wrapper.findAll('[data-testid="related-item"]')
    const openButtons = wrapper.findAll('[data-testid="related-open"]')

    expect(cards[0].get('img').attributes('src')).toBe('/related/one')
    expect(cards[0].get('img').attributes('alt')).toContain('相邻层热力图')
    expect(cards[1].text()).toContain('参数记录')
    expect(openButtons.every((button) => button.element.tagName === 'BUTTON')).toBe(
      true,
    )

    await openButtons[0].trigger('click')
    await openButtons[1].trigger('keydown', { key: 'Enter' })
    openButtons[1].element.click()

    expect(wrapper.emitted('open')).toEqual([[items[0]], [items[1]]])
  })

  it('announces image failures and retries or resets when inputs change', async () => {
    const image = { ...items[0], revision: 1 }
    const wrapper = mount(RelatedEvidence, {
      props: {
        items: [image],
        urlFor: (item) => `/related/${item.id}?v=${item.revision}`,
      },
    })

    await wrapper.get('img').trigger('error')
    const fallback = wrapper.get('[role="status"]')
    expect(fallback.attributes('aria-label')).toContain('相邻层热力图')
    expect(fallback.text()).toContain('图像载入失败')

    await wrapper.get('[aria-label="重试载入相邻层热力图"]').trigger('click')
    expect(wrapper.get('img').attributes('src')).toContain('v=1')

    await wrapper.get('img').trigger('error')
    await wrapper.setProps({ items: [{ ...image, revision: 2 }] })
    expect(wrapper.get('img').attributes('src')).toContain('v=2')

    await wrapper.get('img').trigger('error')
    await wrapper.setProps({
      urlFor: (item) => `/replacement/${item.id}?v=${item.revision}`,
    })
    expect(wrapper.get('img').attributes('src')).toContain('/replacement/one')
  })
})
