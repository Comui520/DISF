import { computed, effectScope } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useCaseCharts } from './useCaseCharts.js'
import { demoArtifacts } from '../fixtures/demoArtifacts.js'

describe('useCaseCharts', () => {
  it('loads demo matrix and pair data without calling the API', async () => {
    const apiClient = {
      similarityMatrix: vi.fn(),
      diffMapPair: vi.fn(),
    }
    const context = computed(() => ({
      model: 'vgg16',
      classA: 119,
      classB: 332,
      panel: 'chart',
    }))

    const scope = effectScope()
    const charts = scope.run(() =>
      useCaseCharts({
        context,
        apiClient,
        demoMode: true,
        immediate: true,
      }),
    )

    await Promise.resolve()
    expect(apiClient.similarityMatrix).not.toHaveBeenCalled()
    expect(charts.matrix.value).toEqual(demoArtifacts.matrix)
    expect(charts.pair.value.pair.top_channels).toHaveLength(2)
    scope.stop()
  })

  it('requests slice matrix and diff-map pair for the active class context', async () => {
    const apiClient = {
      similarityMatrix: vi.fn().mockResolvedValue({ exists: true, points: [] }),
      diffMapPair: vi.fn().mockResolvedValue({ exists: true, pair: { top_channels: [] } }),
    }
    const context = computed(() => ({
      model: 'resnet50',
      classA: 4,
      classB: 8,
      panel: 'chart',
    }))

    const scope = effectScope()
    const charts = scope.run(() =>
      useCaseCharts({
        context,
        apiClient,
        demoMode: false,
        immediate: true,
      }),
    )

    await vi.waitFor(() => {
      expect(apiClient.similarityMatrix).toHaveBeenCalledWith('resnet50', {
        format: 'slice',
        class_ids: '4,8',
        limit: 100,
      })
      expect(apiClient.diffMapPair).toHaveBeenCalledWith('resnet50', 4, 8)
      expect(charts.loading.value).toBe(false)
    })
    scope.stop()
  })
})
