// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ImageCompare from './ImageCompare.vue'

const left = {
  id: 'left',
  title: '干预前',
  description: '原始响应区域',
  path: 'compare/before.png',
}
const right = {
  id: 'right',
  title: '干预后',
  description: '干预后的响应区域',
  path: 'compare/after.png',
}

describe('ImageCompare', () => {
  it('renders semantic sides and emits the swapped pair', async () => {
    const urlFor = vi.fn((item) => `/compare/${item.id}`)
    const wrapper = mount(ImageCompare, {
      props: { left, right, urlFor },
    })

    const regions = wrapper.findAll('figure')
    expect(regions).toHaveLength(2)
    expect(regions[0].get('h3').text()).toContain('左侧')
    expect(regions[1].get('h3').text()).toContain('右侧')
    expect(regions[0].get('img').attributes('alt')).toContain('干预前')
    expect(regions[1].get('img').attributes('alt')).toContain('干预后')
    expect(regions[0].get('img').attributes('src')).toBe('/compare/left')
    expect(regions[1].get('img').attributes('src')).toBe('/compare/right')

    await wrapper.get('[aria-label="交换左右图像"]').trigger('click')
    expect(wrapper.emitted('swap')).toEqual([[{ left: right, right: left }]])
  })

  it.each([
    ['左侧', null, right],
    ['右侧', left, null],
  ])('shows guidance when the %s image is missing', (_side, missingLeft, missingRight) => {
    const wrapper = mount(ImageCompare, {
      props: {
        left: missingLeft,
        right: missingRight,
        urlFor: (item) => `/compare/${item.id}`,
      },
    })

    expect(wrapper.get('[role="status"]').text()).toContain('选择两张图像')
    expect(wrapper.find('[data-testid="image-compare"]').exists()).toBe(false)
  })

  it('announces a failed comparison image with its side and title', async () => {
    const wrapper = mount(ImageCompare, {
      props: {
        left,
        right,
        urlFor: (item) => `/compare/${item.id}`,
      },
    })

    await wrapper.findAll('img')[0].trigger('error')
    const fallback = wrapper.get('[data-testid="left-image-fallback"]')
    expect(fallback.attributes('role')).toBe('status')
    expect(fallback.attributes('aria-label')).toContain('左侧图像：干预前')
    expect(fallback.text()).toContain('左侧图像载入失败')
  })
})
