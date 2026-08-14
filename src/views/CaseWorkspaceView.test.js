// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createRef = (value) => {
  const state = { value }
  return {
    get value() {
      return state.value
    },
    set value(next) {
      state.value = next
    },
    __v_isRef: true,
  }
}

const routerMocks = vi.hoisted(() => ({
  route: {
    query: {
      model: 'vgg16',
      stage: 'causal',
      classA: '119',
      classB: '332',
      artifact: 'results/causal/119_vs_332_heatmap.png',
      panel: 'image',
    },
  },
  push: vi.fn(),
  replace: vi.fn(),
}))

const indexMocks = vi.hoisted(() => ({
  items: null,
  loading: null,
  error: null,
  isDemo: null,
  refresh: vi.fn(async () => ({ items: [], errors: [] })),
}))

indexMocks.items = createRef([])
indexMocks.loading = createRef(false)
indexMocks.error = createRef(null)
indexMocks.isDemo = createRef(false)

vi.mock('vue-router', () => ({
  useRoute: () => routerMocks.route,
  useRouter: () => ({
    push: routerMocks.push,
    replace: routerMocks.replace,
  }),
  RouterLink: defineComponent({
    name: 'RouterLink',
    props: { to: { type: [String, Object], required: true } },
    setup(props, { slots }) {
      return () =>
        h(
          'a',
          { href: typeof props.to === 'string' ? props.to : '#' },
          slots.default?.(),
        )
    },
  }),
}))

vi.mock('@/composables/useArtifactIndex.js', () => ({
  useArtifactIndex: () => ({
    items: indexMocks.items,
    loading: indexMocks.loading,
    error: indexMocks.error,
    isDemo: indexMocks.isDemo,
    demoData: createRef(null),
    refresh: indexMocks.refresh,
  }),
}))

vi.mock('@/composables/useCaseCharts.js', () => ({
  useCaseCharts: () => ({
    matrix: createRef(null),
    pair: createRef(null),
    loading: createRef(false),
    error: createRef(null),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/api', () => ({
  api: {
    fileUrl: (path) => `/api/files/${path}`,
    labels: () => Promise.resolve([]),
  },
}))

import CaseWorkspaceView from './CaseWorkspaceView.vue'

const sampleItems = [
  {
    id: 'heat',
    title: '因果干预热力图',
    description: '用于查看类别 119 与 332 在 mask.10 层对应的可视化产物。',
    path: 'results/causal/119_vs_332_heatmap.png',
    model: 'vgg16',
    stage: 'causal',
    classA: 119,
    classB: 332,
    layer: 'mask.10',
    kind: 'heatmap',
    isImage: true,
    source: 'results',
  },
  {
    id: 'compare',
    title: '模糊测试对比图',
    path: 'results/fuzzing/119_vs_332_compare.png',
    model: 'vgg16',
    stage: 'fuzzing',
    classA: 119,
    classB: 332,
    kind: 'comparison',
    isImage: true,
  },
]

describe('CaseWorkspaceView', () => {
  beforeEach(() => {
    routerMocks.route.query = {
      model: 'vgg16',
      stage: 'causal',
      classA: '119',
      classB: '332',
      artifact: 'results/causal/119_vs_332_heatmap.png',
      panel: 'image',
    }
    routerMocks.push.mockReset()
    routerMocks.replace.mockReset()
    indexMocks.items.value = sampleItems
    indexMocks.loading.value = false
    indexMocks.error.value = null
    indexMocks.isDemo.value = false
  })

  it('shows the selected case and switches panels via research query', async () => {
    const wrapper = mount(CaseWorkspaceView)
    await flushPromises()

    expect(wrapper.get('[data-testid="case-workspace"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('因果干预热力图')
    expect(wrapper.get('[data-testid="case-image"]').attributes('src')).toBe(
      '/api/files/results/causal/119_vs_332_heatmap.png',
    )

    await wrapper.get('[data-panel="insight"]').trigger('click')
    expect(routerMocks.replace).toHaveBeenCalledWith({
      query: expect.objectContaining({ panel: 'insight' }),
    })
  })

  it('deep-links related evidence and adjacent stages', async () => {
    const wrapper = mount(CaseWorkspaceView)
    await flushPromises()

    await wrapper.get('[data-testid="related-open"]').trigger('click')
    expect(routerMocks.push).toHaveBeenCalledWith({
      name: 'case',
      query: expect.objectContaining({
        artifact: 'results/fuzzing/119_vs_332_compare.png',
        stage: 'fuzzing',
        panel: 'image',
      }),
    })

    await wrapper.get('[data-testid="next-stage"]').trigger('click')
    expect(routerMocks.push).toHaveBeenCalledWith({
      name: 'case',
      query: expect.objectContaining({
        artifact: 'results/fuzzing/119_vs_332_compare.png',
        stage: 'fuzzing',
        panel: 'image',
      }),
    })
  })

  it('keeps the image panel when jumping stages from a chart view', async () => {
    routerMocks.route.query = {
      ...routerMocks.route.query,
      panel: 'chart',
    }
    const wrapper = mount(CaseWorkspaceView)
    await flushPromises()

    await wrapper.get('[data-testid="next-stage"]').trigger('click')
    expect(routerMocks.push).toHaveBeenCalledWith({
      name: 'case',
      query: expect.objectContaining({
        stage: 'fuzzing',
        panel: 'image',
      }),
    })
  })

  it('canonicalizes a mismatched stage back to the artifact stage', async () => {
    routerMocks.route.query = {
      model: 'vgg16',
      stage: 'fuzzing',
      artifact: 'results/causal/119_vs_332_heatmap.png',
      panel: 'image',
    }
    mount(CaseWorkspaceView)
    await flushPromises()

    expect(routerMocks.replace).toHaveBeenCalledWith({
      query: expect.objectContaining({
        stage: 'causal',
        artifact: 'results/causal/119_vs_332_heatmap.png',
      }),
    })
  })

  it('returns to the evidence library when no artifact is selected', async () => {
    routerMocks.route.query = { stage: 'subarch' }
    const wrapper = mount(CaseWorkspaceView)
    await flushPromises()

    expect(wrapper.text()).toContain('尚未选定案例证据')
    await wrapper.get('[data-testid="back-library"]').trigger('click')
    expect(routerMocks.push).toHaveBeenCalledWith({
      name: 'evidence',
      query: { stage: 'subarch' },
    })
  })
})
