// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./EChartFrame.vue', () => ({
  default: {
    name: 'EChartFrame',
    props: ['option', 'height'],
    template: '<div data-testid="echart-frame-stub" />',
  },
}))

import SimilarityMatrix from './SimilarityMatrix.vue'
import CausalChannels from './CausalChannels.vue'

describe('research chart components', () => {
  it('renders the matrix chart when slice points exist', () => {
    const wrapper = mount(SimilarityMatrix, {
      props: {
        matrix: {
          exists: true,
          class_ids: [119, 332],
          points: [
            { x: 119, y: 119, value: 1 },
            { x: 119, y: 332, value: 0.62 },
          ],
        },
      },
    })

    expect(wrapper.get('[data-testid="similarity-matrix"]').text()).toContain(
      '相似度矩阵切片',
    )
    expect(wrapper.find('[data-testid="echart-frame-stub"]').exists()).toBe(true)
  })

  it('keeps an empty state when causal channels are missing', () => {
    const wrapper = mount(CausalChannels, {
      props: {
        pair: { exists: true, pair: { top_channels: [] } },
        classA: 119,
        classB: 332,
      },
    })

    expect(wrapper.text()).toContain('暂无通道效应')
  })
})
