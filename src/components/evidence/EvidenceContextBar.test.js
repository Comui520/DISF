// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EvidenceContextBar from './EvidenceContextBar.vue'

const stages = [
  { key: 'subarch', name: '相似子架构' },
  { key: 'causal', name: '因果干预' },
  { key: 'fuzzing', name: '因果模糊测试' },
]

describe('EvidenceContextBar', () => {
  it('keeps research context visible and treats every stage as a direct destination', async () => {
    const wrapper = mount(EvidenceContextBar, {
      props: {
        context: {
          model: 'vgg16',
          stage: 'causal',
          classA: 119,
          classB: 332,
          layer: 'mask.10',
        },
        stages,
        isDemo: true,
      },
    })

    expect(wrapper.text()).toContain('vgg16')
    expect(wrapper.text()).toContain('119 ↔ 332')
    expect(wrapper.text()).toContain('mask.10')
    expect(wrapper.text()).toContain('示例数据')

    const current = wrapper.get('[data-stage="causal"]')
    expect(current.attributes('aria-current')).toBe('step')
    expect(wrapper.findAll('[data-stage]').every((button) => !button.attributes('disabled'))).toBe(
      true,
    )

    await wrapper.get('[data-stage="fuzzing"]').trigger('click')
    await wrapper.get('[aria-label="清除类别对"]').trigger('click')

    expect(wrapper.emitted('stage-change')).toEqual([['fuzzing']])
    expect(wrapper.emitted('clear-pair')).toHaveLength(1)
  })
})
