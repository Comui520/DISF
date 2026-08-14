// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
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
  route: { query: {} },
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

vi.mock('@/api', () => ({
  api: {
    fileUrl: (path) => `/api/files/${path}`,
    labels: () => Promise.resolve([]),
    models: () =>
      Promise.resolve([
        { net: 'vgg16', name: 'VGG16', dataset: 'place' },
        { net: 'resnet50', name: 'ResNet50', dataset: 'place' },
        { net: 'cnn_bilstm', name: 'CNN-BiLSTM', dataset: 'unsw' },
      ]),
  },
}))

import EvidenceLibraryView from './EvidenceLibraryView.vue'

const sampleItems = [
  {
    id: 'subarch',
    title: '相似子架构产物',
    path: 'results/similarSubArch/place/vgg16/119/similar_subarch.png',
    model: 'vgg16',
    stage: 'subarch',
    classA: 119,
    kind: 'similar-subarch',
    isImage: true,
  },
  {
    id: 'mask',
    title: '模型掩码',
    path: 'image/vgg16_masks.png',
    model: 'vgg16',
    stage: 'subarch',
    kind: 'mask',
    isImage: true,
  },
  {
    id: 'heat',
    title: '因果干预热力图',
    path: 'results/causal/119_vs_332_heatmap.png',
    model: 'vgg16',
    stage: 'causal',
    classA: 119,
    classB: 332,
    layer: 'mask.10',
    kind: 'heatmap',
    isImage: true,
  },
]

describe('EvidenceLibraryView', () => {
  beforeEach(() => {
    routerMocks.route.query = { stage: 'subarch' }
    routerMocks.push.mockReset()
    routerMocks.replace.mockReset()
    indexMocks.items.value = sampleItems
    indexMocks.loading.value = false
    indexMocks.error.value = null
    indexMocks.isDemo.value = false
    indexMocks.refresh.mockClear()
  })

  it('renders filtered image evidence and opens a deep-linked case', async () => {
    const wrapper = mount(EvidenceLibraryView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="typeof to === \'string\' ? to : \'#\'"><slot /></a>',
          },
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="evidence-library"]').exists()).toBe(true)
    expect(routerMocks.replace).toHaveBeenCalledWith({
      query: expect.objectContaining({ model: 'vgg16' }),
    })
    expect(wrapper.text()).toContain('证据库')
    expect(wrapper.text()).toContain('VGG16 · Places')
    expect(wrapper.text()).toContain('CNN-BiLSTM · UNSW')
    expect(wrapper.findAll('[data-testid="artifact-card"]')).toHaveLength(1)

    await wrapper.get('[data-testid="artifact-open"]').trigger('click')
    expect(routerMocks.push).toHaveBeenCalledWith({
      name: 'case',
      query: {
        model: 'vgg16',
        stage: 'subarch',
        classA: 119,
        artifact: 'results/similarSubArch/place/vgg16/119/similar_subarch.png',
        panel: 'image',
      },
    })
  })

  it('keeps model and pair filters in the research query', async () => {
    const wrapper = mount(EvidenceLibraryView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="typeof to === \'string\' ? to : \'#\'"><slot /></a>',
          },
        },
      },
    })
    await flushPromises()

    await wrapper.get('[data-testid="filter-model"]').setValue('')
    expect(routerMocks.replace).toHaveBeenCalledWith({
      query: expect.objectContaining({ model: 'all' }),
    })

    await wrapper.get('[data-testid="filter-model"]').setValue('vgg16')
    expect(routerMocks.replace).toHaveBeenCalledWith({
      query: expect.objectContaining({ model: 'vgg16' }),
    })

    routerMocks.route.query = { stage: 'subarch', model: 'vgg16' }
    await nextTick()
    await wrapper.get('[data-testid="filter-pair"]').setValue('119:332')
    expect(routerMocks.replace).toHaveBeenCalledWith({
      query: expect.objectContaining({
        classA: 119,
        classB: 332,
      }),
    })
  })
})
