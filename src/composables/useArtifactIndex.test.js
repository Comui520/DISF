import { effectScope, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import {
  loadArtifactIndex,
  useArtifactIndex,
} from './useArtifactIndex.js'

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('loadArtifactIndex', () => {
  it('loads stage-scoped dirs and keeps partial results when one fails', async () => {
    const subarchRequest = deferred()
    const imageRequest = deferred()
    const calls = []
    const apiClient = {
      artifactImages: vi.fn((relDir) => {
        calls.push(`artifacts:${relDir}`)
        return relDir === 'results/similarSubArch'
          ? subarchRequest.promise
          : imageRequest.promise
      }),
      fuzzingResults: vi.fn(),
    }

    const pending = loadArtifactIndex(apiClient, 'vgg16', {
      stage: 'subarch',
      includeImageRoot: true,
      limit: 100,
    })

    expect(calls).toEqual(['artifacts:results/similarSubArch', 'artifacts:image'])

    subarchRequest.resolve([
      {
        path: 'results/similarSubArch/place/vgg16/119/similar_subarch.png',
        name: 'similar_subarch.png',
        mtime: 10,
        size: 100,
      },
    ])
    imageRequest.reject(new Error('image source unavailable'))

    const result = await pending

    expect(result.errors).toEqual([
      expect.objectContaining({
        source: 'image',
        message: 'image source unavailable',
      }),
    ])
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: 'subarch',
          classA: 119,
          kind: 'similar-subarch',
        }),
      ]),
    )
  })

  it('can expand fuzzing API images without pkl parents', async () => {
    const apiClient = {
      artifactImages: vi.fn(() => Promise.resolve([])),
      fuzzingResults: vi.fn(() =>
        Promise.resolve([
          {
            path: 'results/fuzzing/place/vgg16/errors_119_vs_332.pkl',
            name: 'errors_119_vs_332.pkl',
            mtime: 20,
            size: 200,
            num_errors: 2,
            images: [
              'results/fuzzing/place/vgg16/119_vs_332_adversarial_compare.png',
            ],
          },
        ]),
      ),
    }

    const result = await loadArtifactIndex(apiClient, 'vgg16', {
      relDirs: [],
      includeFuzzingApi: true,
    })

    expect(apiClient.artifactImages).not.toHaveBeenCalled()
    expect(apiClient.fuzzingResults).toHaveBeenCalled()
    const fuzzingImage = result.items.find(
      ({ path }) =>
        path ===
        'results/fuzzing/place/vgg16/119_vs_332_adversarial_compare.png',
    )
    expect(fuzzingImage).toEqual(
      expect.objectContaining({
        stage: 'fuzzing',
        fuzzingNumErrors: 2,
      }),
    )
    expect(
      result.items.some((item) => String(item.path || '').endsWith('.pkl')),
    ).toBe(false)
  })
})

describe('useArtifactIndex', () => {
  it('refreshes live data from case index directories', async () => {
    const apiClient = {
      artifactImages: vi.fn((relDir) =>
        Promise.resolve(
          relDir === 'results/causal_intervention'
            ? [
                {
                  path: 'results/causal_intervention/place/vgg16/heatmaps/1_vs_2_mask.3.png',
                  name: '1_vs_2_mask.3.png',
                  mtime: 10,
                  size: 100,
                },
              ]
            : [],
        ),
      ),
      fuzzingResults: vi.fn(),
    }
    const state = useArtifactIndex({
      apiClient,
      demoMode: false,
      immediate: false,
      relDirs: 'case',
    })

    await state.refresh()

    expect(state.loading.value).toBe(false)
    expect(state.isDemo.value).toBe(false)
    expect(state.error.value).toBeNull()
    expect(state.items.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'results/causal_intervention/place/vgg16/heatmaps/1_vs_2_mask.3.png',
        }),
      ]),
    )
    expect(apiClient.fuzzingResults).not.toHaveBeenCalled()
  })

  it('reloads when the active stage changes', async () => {
    const stage = ref('subarch')
    const calls = []
    const apiClient = {
      artifactImages: vi.fn((relDir) => {
        calls.push(relDir)
        return Promise.resolve([])
      }),
      fuzzingResults: vi.fn(),
    }
    const scope = effectScope()
    scope.run(() => {
      useArtifactIndex({
        apiClient,
        demoMode: false,
        immediate: true,
        stage: () => stage.value,
      })
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toContain('results/similarSubArch')

    stage.value = 'causal'
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toContain('results/causal_intervention')
    scope.stop()
  })

  it('does not let an older refresh overwrite newer state', async () => {
    const requests = [deferred(), deferred()]
    let call = 0
    const apiClient = {
      artifactImages: vi.fn(() => requests[call++]?.promise || Promise.resolve([])),
      fuzzingResults: vi.fn(),
    }
    const state = useArtifactIndex({
      apiClient,
      demoMode: false,
      immediate: false,
      stage: 'subarch',
    })

    const olderRefresh = state.refresh()
    const newerRefresh = state.refresh()

    requests[1].resolve([
      {
        path: 'results/similarSubArch/newer.png',
        name: 'newer.png',
        mtime: 20,
        size: 20,
      },
    ])
    await newerRefresh
    expect(state.items.value.map(({ path }) => path)).toEqual([
      'results/similarSubArch/newer.png',
    ])

    requests[0].resolve([
      {
        path: 'results/similarSubArch/older.png',
        name: 'older.png',
        mtime: 10,
        size: 10,
      },
    ])
    await olderRefresh

    expect(state.loading.value).toBe(false)
    expect(state.items.value.map(({ path }) => path)).toEqual([
      'results/similarSubArch/newer.png',
    ])
  })

  it('does not write pending request results after its scope stops', async () => {
    const request = deferred()
    const apiClient = {
      artifactImages: vi.fn(() => request.promise),
      fuzzingResults: vi.fn(),
    }
    const scope = effectScope()
    let state
    scope.run(() => {
      state = useArtifactIndex({
        apiClient,
        demoMode: false,
        immediate: false,
        stage: 'subarch',
      })
    })

    const pending = state.refresh()
    expect(state.loading.value).toBe(true)
    scope.stop()

    request.resolve([
      {
        path: 'results/similarSubArch/after-stop.png',
        name: 'after-stop.png',
        mtime: 10,
        size: 10,
      },
    ])
    await pending

    expect(state.loading.value).toBe(false)
    expect(state.items.value).toEqual([])
    expect(state.error.value).toBeNull()
  })

  it('uses marked fixtures without contacting the API in demo mode', async () => {
    const apiClient = {
      artifactImages: vi.fn(),
      fuzzingResults: vi.fn(),
    }
    const state = useArtifactIndex({
      apiClient,
      demoMode: true,
      immediate: false,
    })

    await state.refresh()

    expect(apiClient.artifactImages).not.toHaveBeenCalled()
    expect(apiClient.fuzzingResults).not.toHaveBeenCalled()
    expect(state.isDemo.value).toBe(true)
    expect(state.loading.value).toBe(false)
    expect(state.error.value).toBeNull()
    expect(state.items.value.length).toBeGreaterThan(0)
    expect(state.items.value.every((item) => item.demo)).toBe(true)
  })
})
