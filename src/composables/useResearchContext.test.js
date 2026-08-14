import { beforeEach, describe, expect, it, vi } from 'vitest'

const routerMocks = vi.hoisted(() => ({
  route: { query: {} },
  push: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routerMocks.route,
  useRouter: () => ({
    push: routerMocks.push,
    replace: routerMocks.replace,
  }),
}))

import {
  parseResearchQuery,
  toResearchQuery,
  useResearchContext,
} from './useResearchContext.js'

describe('research query conversion', () => {
  it('parses and normalizes research query fields', () => {
    expect(
      parseResearchQuery({
        model: 'vgg16',
        stage: 'causal',
        classA: '119',
        classB: 332,
        artifact: 'results/example.png',
        panel: 'chart',
      }),
    ).toEqual({
      model: 'vgg16',
      stage: 'causal',
      classA: 119,
      classB: 332,
      artifact: 'results/example.png',
      panel: 'chart',
    })
  })

  it('treats model=all as an explicit all-models filter', () => {
    expect(parseResearchQuery({ model: 'all', stage: 'subarch' })).toEqual(
      expect.objectContaining({ model: null, stage: 'subarch' }),
    )
  })

  it('falls back for invalid stages, panels, and class ids', () => {
    expect(
      parseResearchQuery({
        stage: 'unknown',
        panel: 'unknown',
        classA: 'not-a-number',
        classB: '',
      }),
    ).toEqual({
      model: null,
      stage: 'subarch',
      classA: null,
      classB: null,
      artifact: null,
      panel: 'image',
    })
  })

  it('round-trips context while preserving unrelated query fields', () => {
    const context = {
      model: 'resnet50',
      stage: 'fuzzing',
      classA: 4,
      classB: 8,
      artifact: 'image/resnet50_masks.pdf',
      panel: 'params',
    }

    const query = toResearchQuery(context, {
      tab: 'overview',
      model: 'stale',
    })

    expect(query.tab).toBe('overview')
    expect(parseResearchQuery(query)).toEqual(context)
  })

  it('removes null or empty research fields from a base query', () => {
    expect(
      toResearchQuery(
        {
          model: '',
          stage: null,
          classA: null,
          classB: '',
          artifact: null,
          panel: '',
        },
        {
          model: 'vgg16',
          stage: 'causal',
          classA: '119',
          classB: '332',
          artifact: 'old.png',
          panel: 'chart',
          keep: 'yes',
        },
      ),
    ).toEqual({ keep: 'yes' })
  })
})

describe('useResearchContext', () => {
  beforeEach(() => {
    routerMocks.route.query = {
      model: 'vgg16',
      stage: 'subarch',
      classA: '119',
      keep: 'yes',
    }
    routerMocks.push.mockReset()
    routerMocks.replace.mockReset()
  })

  it('exposes computed context and pushes query updates by default', async () => {
    const { context, updateContext } = useResearchContext()

    expect(context.value.classA).toBe(119)
    await updateContext({ panel: 'insight', classB: 332 })

    expect(routerMocks.push).toHaveBeenCalledWith({
      query: expect.objectContaining({
        model: 'vgg16',
        stage: 'subarch',
        classA: '119',
        classB: 332,
        panel: 'insight',
        keep: 'yes',
      }),
    })
  })

  it('writes only patched research fields without inserting defaults', async () => {
    routerMocks.route.query = {
      model: 'vgg16',
      keep: 'yes',
    }
    const { updateContext } = useResearchContext()

    await updateContext({ classA: 119 })

    expect(routerMocks.push).toHaveBeenCalledWith({
      query: {
        model: 'vgg16',
        classA: 119,
        keep: 'yes',
      },
    })
  })

  it('can replace the route and remove a research field', async () => {
    const { updateContext } = useResearchContext()

    await updateContext({ model: null }, { replace: true })

    expect(routerMocks.replace).toHaveBeenCalledWith({
      query: {
        stage: 'subarch',
        classA: '119',
        keep: 'yes',
      },
    })
  })
})
