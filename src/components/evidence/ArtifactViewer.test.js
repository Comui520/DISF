// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import ArtifactViewer from './ArtifactViewer.vue'

const items = [
  {
    id: 'before',
    title: '输入掩码',
    path: 'evidence/before.png',
    stage: 'subarch',
    kind: 'mask',
    model: 'vgg16',
    isImage: true,
  },
  {
    id: 'current',
    title: '类别干预热力图',
    description: '展示类别对在目标层上的响应区域。',
    path: 'private/causal/119-vs-332/mask.10-heatmap.png',
    stage: 'causal',
    kind: 'heatmap',
    model: 'vgg16',
    classA: 119,
    classB: 332,
    layer: 'mask.10',
    isImage: true,
  },
  {
    id: 'after',
    title: '结果对比',
    path: 'evidence/after.png',
    stage: 'guide',
    kind: 'comparison',
    isImage: true,
  },
]

const activeWrappers = new Set()
const mountViewer = (props = {}) => {
  const host = document.createElement('div')
  host.dataset.testHost = ''
  document.body.append(host)
  const wrapper = mount(ArtifactViewer, {
    attachTo: host,
    props: {
      item: items[1],
      items,
      urlFor: (item) => `/files/${item.id}`,
      ...props,
    },
  })
  activeWrappers.add(wrapper)
  return wrapper
}

const settle = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const get = (selector) => {
  const element = document.body.querySelector(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

const click = async (selector) => {
  get(selector).click()
  await settle()
}

const keydown = (key, init = {}, target = window) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  for (const wrapper of activeWrappers) {
    wrapper.unmount()
  }
  activeWrappers.clear()
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
})

describe('ArtifactViewer', () => {
  it('navigates, closes, and opens a supporting panel without hiding the image', async () => {
    const wrapper = mountViewer()
    await settle()

    await click('[aria-label="上一张证据"]')
    await click('[aria-label="下一张证据"]')
    await click('[data-panel="insight"]')
    await click('[aria-label="关闭查看器"]')

    expect(wrapper.emitted('navigate')).toEqual([[items[0]], [items[2]]])
    expect(wrapper.emitted('show-panel')).toEqual([['insight']])
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(get('[data-testid="artifact-canvas"]').querySelector('img')).not.toBeNull()
  })

  it('uses layout dimensions for zoom and clamps controls to 50%–200%', async () => {
    mountViewer()
    await settle()

    for (let index = 0; index < 4; index += 1) {
      await click('[aria-label="放大"]')
    }
    expect(get('[data-testid="zoom-value"]').textContent.trim()).toBe('200%')
    expect(get('[aria-label="放大"]').disabled).toBe(true)
    expect(get('[data-testid="zoom-surface"]').style.width).toBe('200%')
    expect(get('[data-testid="viewer-image"]').style.transform).toBe('')

    for (let index = 0; index < 6; index += 1) {
      await click('[aria-label="缩小"]')
    }
    expect(get('[data-testid="zoom-value"]').textContent.trim()).toBe('50%')
    expect(get('[aria-label="缩小"]').disabled).toBe(true)

    await click('[aria-label="重置缩放"]')
    expect(get('[data-testid="zoom-value"]').textContent.trim()).toBe('100%')
  })

  it('handles only unmodified explicit shortcuts outside editable controls', async () => {
    const wrapper = mountViewer()
    await settle()

    for (const event of [
      keydown('+', { ctrlKey: true }),
      keydown('-', { metaKey: true }),
      keydown('+', { altKey: true }),
      keydown('='),
    ]) {
      expect(event.defaultPrevented).toBe(false)
    }
    expect(get('[data-testid="zoom-value"]').textContent.trim()).toBe('100%')

    const input = document.createElement('input')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    get('.artifact-viewer').append(input, editable)
    expect(keydown('+', {}, input).defaultPrevented).toBe(false)
    expect(keydown('-', {}, editable).defaultPrevented).toBe(false)
    expect(get('[data-testid="zoom-value"]').textContent.trim()).toBe('100%')

    expect(keydown('+').defaultPrevented).toBe(true)
    await settle()
    expect(get('[data-testid="zoom-value"]').textContent.trim()).toBe('125%')
    expect(keydown('-').defaultPrevented).toBe(true)
    await settle()
    expect(get('[data-testid="zoom-value"]').textContent.trim()).toBe('100%')

    keydown('ArrowRight')
    keydown('Escape')
    await settle()
    expect(wrapper.emitted('navigate')?.at(-1)).toEqual([items[2]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not intercept unavailable navigation at the first or last item', async () => {
    const first = mountViewer({ item: items[0] })
    await settle()
    expect(get('[aria-label="上一张证据"]').disabled).toBe(true)
    expect(keydown('ArrowLeft').defaultPrevented).toBe(false)
    expect(first.emitted('navigate')).toBeUndefined()
    first.unmount()
    activeWrappers.delete(first)

    const last = mountViewer({ item: items[2] })
    await settle()
    expect(get('[aria-label="下一张证据"]').disabled).toBe(true)
    expect(keydown('ArrowRight').defaultPrevented).toBe(false)
    expect(last.emitted('navigate')).toBeUndefined()
  })

  it('traps focus, inerts background siblings, locks scroll, and restores on close', async () => {
    const opener = document.createElement('button')
    const background = document.createElement('main')
    opener.textContent = '打开查看器'
    document.body.append(opener, background)
    opener.focus()

    mountViewer()
    await settle()

    const dialog = get('.artifact-viewer')
    const focusables = [
      ...dialog.querySelectorAll(
        'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      ),
    ]
    expect(dialog.parentElement).toBe(document.body)
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(focusables[0])
    expect(background.hasAttribute('inert')).toBe(true)
    expect(dialog.hasAttribute('inert')).toBe(false)
    expect(document.body.style.overflow).toBe('hidden')

    focusables.at(-1).focus()
    expect(keydown('Tab').defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(focusables[0])

    focusables[0].focus()
    expect(keydown('Tab', { shiftKey: true }).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(focusables.at(-1))

    await click('[aria-label="关闭查看器"]')
    expect(document.activeElement).toBe(opener)
    expect(background.hasAttribute('inert')).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  it('restores pre-existing body and sibling state when unmounted', async () => {
    const opener = document.createElement('button')
    const preInert = document.createElement('div')
    const regular = document.createElement('div')
    preInert.setAttribute('inert', '')
    document.body.style.overflow = 'scroll'
    document.body.append(opener, preInert, regular)
    opener.focus()

    const wrapper = mountViewer()
    await settle()
    wrapper.unmount()
    activeWrappers.delete(wrapper)

    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe('scroll')
    expect(preInert.hasAttribute('inert')).toBe(true)
    expect(regular.hasAttribute('inert')).toBe(false)

    const event = keydown('ArrowRight')
    await settle()
    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.emitted('navigate')).toBeUndefined()
  })

  it('shows demo provenance and keeps the original path in folded details', async () => {
    mountViewer({ isDemo: true })
    await settle()

    expect(document.body.textContent).toContain('示例数据')
    expect(document.body.textContent).toContain('vgg16')
    expect(document.body.textContent).toContain('119 ↔ 332')
    expect(document.body.textContent).toContain('mask.10')
    expect(get('details summary').textContent).toContain('原始路径')
    expect(get('details code').textContent).toBe(items[1].path)
  })

  it('provides PDF actions without irrelevant zoom controls or shortcuts', async () => {
    const pdf = {
      id: 'report',
      title: '研究记录',
      path: 'reports/evidence.pdf',
      isPdf: true,
      stage: 'guide',
      kind: 'report',
    }
    mountViewer({ item: pdf, items: [pdf] })
    await settle()

    expect(get('[data-testid="pdf-preview"]').getAttribute('data')).toBe(
      '/files/report',
    )
    expect(get('[aria-label="下载原文件"]').getAttribute('download')).toBe('')
    expect(get('[aria-label="在新窗口打开"]').getAttribute('target')).toBe('_blank')
    expect(document.body.textContent).toContain('无法内嵌预览时')
    expect(document.body.querySelector('[data-testid="zoom-controls"]')).toBeNull()
    expect(keydown('+').defaultPrevented).toBe(false)
  })

  it('hides zoom after an image error and can retry the same source', async () => {
    mountViewer()
    await settle()

    get('[data-testid="viewer-image"]').dispatchEvent(new Event('error'))
    await settle()
    expect(document.body.querySelector('[data-testid="zoom-controls"]')).toBeNull()
    expect(get('[role="alert"]').textContent).toContain('图像无法显示')

    await click('[aria-label="重试显示图像"]')
    expect(get('[data-testid="viewer-image"]').getAttribute('src')).toBe(
      '/files/current',
    )
    expect(get('[data-testid="zoom-controls"]')).not.toBeNull()
  })
})
