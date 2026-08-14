// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ArtifactGallery from './ArtifactGallery.vue'

const artifacts = [
  {
    id: 'subarch',
    title: '相似子架构产物 · vgg16 · 类别 119',
    path: 'results/similarSubArch/place/vgg16/119/similar_subarch.png',
    stage: 'subarch',
    kind: 'similar-subarch',
    model: 'vgg16',
    classA: 119,
    isImage: true,
  },
  {
    id: 'heatmap',
    title: '因果干预热力图',
    path: 'results/causal/119_vs_332_heatmap.png',
    stage: 'causal',
    kind: 'heatmap',
    model: 'vgg16',
    classA: 119,
    classB: 332,
    layer: 'mask.10',
    isImage: true,
  },
  {
    id: 'report',
    title: '掩码研究记录',
    path: 'private/results/resnet50_masks.pdf',
    stage: 'subarch',
    kind: 'mask',
    model: 'resnet50',
    isPdf: true,
    isImage: false,
  },
]

describe('ArtifactGallery', () => {
  it('renders equal image cards and skips PDFs', () => {
    const urlFor = vi.fn((item) => `/evidence/${item.id}`)
    const wrapper = mount(ArtifactGallery, {
      props: {
        items: artifacts,
        urlFor,
      },
    })

    const cards = wrapper.findAll('[data-testid="artifact-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].classes()).not.toContain('artifact-card--featured')
    expect(cards[0].get('img').attributes('src')).toBe('/evidence/subarch')
    expect(cards[0].text()).toContain('vgg16')
    expect(wrapper.text()).not.toContain('PDF')
    expect(urlFor).toHaveBeenCalledWith(artifacts[0])
  })

  it('emits open from the native card button', async () => {
    const wrapper = mount(ArtifactGallery, {
      props: {
        items: artifacts,
        urlFor: (item) => `/evidence/${item.id}`,
      },
    })
    const openButtons = wrapper.findAll('[data-testid="artifact-open"]')
    expect(openButtons).toHaveLength(2)
    await openButtons[0].trigger('click')
    expect(wrapper.emitted('open')).toEqual([[artifacts[0]]])
  })

  it('keeps a quiet image-failure fallback with retry', async () => {
    const wrapper = mount(ArtifactGallery, {
      props: {
        items: [artifacts[0]],
        urlFor: () => '/broken.png',
      },
    })
    await wrapper.get('img').trigger('error')
    expect(wrapper.text()).toContain('图像载入失败')
    await wrapper.get('.artifact-card__retry').trigger('click')
    expect(wrapper.find('img').exists()).toBe(true)
  })
})
