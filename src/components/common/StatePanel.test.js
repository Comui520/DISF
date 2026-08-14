// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import StatePanel from './StatePanel.vue'

describe('StatePanel', () => {
  it('announces loading progress and exposes a non-verbal skeleton', () => {
    const wrapper = mount(StatePanel, {
      props: {
        state: 'loading',
        title: '正在整理证据',
        description: '请稍候，图像正在建立索引。',
      },
    })

    const panel = wrapper.get('[role="status"]')
    expect(panel.attributes('aria-live')).toBe('polite')
    expect(panel.text()).toContain('正在整理证据')
    expect(wrapper.findAll('[data-testid="skeleton-line"]')).toHaveLength(3)
    expect(wrapper.get('[data-testid="state-visual"]').attributes('aria-hidden')).toBe(
      'true',
    )
  })

  it('announces errors and emits retry plus action from the provided action', async () => {
    const wrapper = mount(StatePanel, {
      props: {
        state: 'error',
        title: '载入失败',
        description: '请检查数据源后重试。',
        actionLabel: '重新载入',
      },
    })

    expect(wrapper.get('[role="alert"]').attributes('aria-live')).toBe('assertive')
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('action')).toHaveLength(1)
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
