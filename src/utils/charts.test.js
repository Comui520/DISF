import { describe, expect, it } from 'vitest'

import {
  buildCausalChannelsOption,
  buildHeatmapOption,
  buildPairBarsOption,
  causalChannelSeries,
  matrixHeatmapSeries,
  similarityPairBars,
} from './charts.js'

const matrix = {
  exists: true,
  class_ids: [119, 332],
  points: [
    { x: 119, y: 119, value: 1 },
    { x: 119, y: 332, value: 0.62 },
    { x: 332, y: 119, value: 0.62 },
    { x: 332, y: 332, value: 1 },
  ],
}

describe('chart data helpers', () => {
  it('maps matrix points into heatmap coordinates', () => {
    expect(matrixHeatmapSeries(matrix)).toEqual({
      classIds: [119, 332],
      data: [
        [0, 0, 1],
        [0, 1, 0.62],
        [1, 0, 0.62],
        [1, 1, 1],
      ],
      min: 0.62,
      max: 1,
    })
    expect(buildHeatmapOption(matrix).series[0].type).toBe('heatmap')
  })

  it('builds ranked similarity pair bars', () => {
    const bars = similarityPairBars(matrix, { limit: 1 })
    expect(bars).toEqual({
      labels: ['119 ↔ 332'],
      values: [0.62],
      pairs: [{ classA: 119, classB: 332, value: 0.62 }],
    })
    expect(buildPairBarsOption(matrix).series[0].data).toEqual([0.62])
  })

  it('builds bidirectional causal channel series', () => {
    const pair = {
      top_channels: [
        { channel: 7, effect_a: 0.2, effect_b: -0.3, causal_score: 0.9 },
        { channel: 4, effect_a: 0.05, effect_b: 0.03, causal_score: 0.4 },
      ],
    }
    expect(causalChannelSeries(pair).labels).toEqual(['ch 7', 'ch 4'])
    expect(buildCausalChannelsOption(pair, { classA: 119, classB: 332 }).legend.data).toEqual([
      '效应 119',
      '效应 332',
    ])
  })
})
