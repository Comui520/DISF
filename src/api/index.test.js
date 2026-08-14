import { afterEach, describe, expect, it, vi } from 'vitest'

import http, { api } from './index.js'

describe('read-only research API methods', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests similarity matrix data with backend parameter names', () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({})

    api.similarityMatrix('vgg16', {
      format: 'slice',
      min_sim: 0.25,
      limit: 20,
      class_ids: '119,332',
    })

    expect(get).toHaveBeenCalledWith('/api/similarity/matrix', {
      params: {
        net: 'vgg16',
        format: 'slice',
        min_sim: 0.25,
        limit: 20,
        class_ids: '119,332',
      },
    })
  })

  it('requests paginated diff-map pairs', () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({})

    api.diffMapPairs('resnet50', { offset: 10, limit: 25 })

    expect(get).toHaveBeenCalledWith('/api/diff-map/pairs', {
      params: {
        net: 'resnet50',
        offset: 10,
        limit: 25,
      },
    })
  })

  it('requests one diff-map pair by class path', () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({})

    api.diffMapPair('vgg16', 119, 332)

    expect(get).toHaveBeenCalledWith('/api/diff-map/pairs/119/332', {
      params: { net: 'vgg16' },
    })
  })
})
