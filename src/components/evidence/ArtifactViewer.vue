<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue'

import StatePanel from '../common/StatePanel.vue'

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  items: {
    type: Array,
    default: () => [],
  },
  urlFor: {
    type: Function,
    required: true,
  },
  isDemo: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'navigate', 'show-panel'])

const MIN_ZOOM = 50
const MAX_ZOOM = 200
const ZOOM_STEP = 25

const viewerRoot = ref(null)
const zoom = ref(100)
const imageFailed = ref(false)
const imageRenderKey = ref(0)
const modalActive = ref(false)
const titleId = `artifact-viewer-${useId()}`
const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'summary',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let previousFocus = null
let savedBodyOverflow = ''
let backgroundStates = []
let listeningForKeyboard = false

const stageLabels = {
  subarch: '相似子架构',
  causal: '因果干预',
  fuzzing: '因果模糊测试',
  guide: '说明材料',
  uncategorized: '未分类',
}

const kindLabels = {
  general: '研究产物',
  mask: '模型掩码',
  framework: '框架示意',
  'similar-subarch': '相似子架构',
  heatmap: '热力图',
  comparison: '图像对比',
  'similarity-matrix': '相似度矩阵',
  'diff-pair': '差异类别对',
  'fuzzing-result': '测试记录',
  parameters: '参数记录',
}

const panelLinks = [
  { key: 'image', label: '图片', mark: 'IMG' },
  { key: 'insight', label: '结论', mark: 'TXT' },
  { key: 'chart', label: '图表', mark: 'CHT' },
  { key: 'params', label: '参数', mark: 'CFG' },
]

const lowerPath = computed(() =>
  String(props.item?.path || props.item?.name || '').toLowerCase(),
)
const isImage = computed(
  () =>
    props.item?.isImage === true ||
    /\.(png|jpe?g|gif|webp|svg)(?:[?#].*)?$/.test(lowerPath.value),
)
const isPdf = computed(
  () =>
    props.item?.isPdf === true ||
    /\.pdf(?:[?#].*)?$/.test(lowerPath.value),
)
const canZoom = computed(() => isImage.value && !imageFailed.value)
const sourceUrl = computed(() => (props.item ? props.urlFor(props.item) : ''))
const title = computed(
  () => props.item?.title || props.item?.name || '未命名研究产物',
)
const hasDemoMark = computed(() => props.isDemo || props.item?.demo === true)
const zoomSurfaceStyle = computed(() => ({
  width: zoom.value >= 100 ? `${zoom.value}%` : '100%',
}))
const zoomImageStyle = computed(() => ({
  width: zoom.value < 100 ? `${zoom.value}%` : '100%',
}))

const currentIndex = computed(() => {
  if (!props.item || !Array.isArray(props.items)) return -1
  return props.items.findIndex(
    (candidate) =>
      candidate === props.item ||
      (candidate?.id !== undefined &&
        props.item?.id !== undefined &&
        String(candidate.id) === String(props.item.id)) ||
      (candidate?.path &&
        props.item?.path &&
        candidate.path === props.item.path),
  )
})
const previousItem = computed(() =>
  currentIndex.value > 0 ? props.items[currentIndex.value - 1] : null,
)
const nextItem = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < props.items.length - 1
    ? props.items[currentIndex.value + 1]
    : null,
)

const classPair = computed(() => {
  const hasA =
    props.item?.classA !== null && props.item?.classA !== undefined
  const hasB =
    props.item?.classB !== null && props.item?.classB !== undefined
  if (hasA && hasB) return `${props.item.classA} ↔ ${props.item.classB}`
  if (hasA) return `类别 ${props.item.classA}`
  if (hasB) return `类别 ${props.item.classB}`
  return ''
})

const metadata = computed(() =>
  [
    props.item?.model
      ? { label: '模型', value: props.item.model }
      : null,
    props.item?.stage
      ? {
          label: '阶段',
          value: stageLabels[props.item.stage] || props.item.stage,
        }
      : null,
    classPair.value
      ? { label: '类别对', value: classPair.value }
      : null,
    props.item?.layer
      ? { label: '网络层', value: props.item.layer }
      : null,
    props.item?.kind
      ? {
          label: '类型',
          value: kindLabels[props.item.kind] || props.item.kind,
        }
      : null,
  ].filter(Boolean),
)

const setZoom = (value) => {
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}
const zoomIn = () => setZoom(zoom.value + ZOOM_STEP)
const zoomOut = () => setZoom(zoom.value - ZOOM_STEP)
const resetZoom = () => setZoom(100)
const retryImage = () => {
  imageFailed.value = false
  imageRenderKey.value += 1
  resetZoom()
}
const navigateTo = (target) => {
  if (target) emit('navigate', target)
}

const getFocusableElements = () =>
  viewerRoot.value
    ? [...viewerRoot.value.querySelectorAll(focusableSelector)].filter(
        (element) =>
          !element.hasAttribute('disabled') &&
          element.getAttribute('aria-hidden') !== 'true',
      )
    : []

const isEditableTarget = (target) => {
  if (!(target instanceof Element)) return false
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  return Boolean(
    target.closest(
      '[contenteditable]:not([contenteditable="false"]), [contenteditable="plaintext-only"]',
    ),
  )
}

const restoreBackground = () => {
  for (const state of backgroundStates) {
    if (state.hadInertAttribute) {
      state.element.setAttribute('inert', '')
    } else {
      state.element.removeAttribute('inert')
    }
    if (state.supportsInert) {
      state.element.inert = state.inertValue
    }
  }
  backgroundStates = []
}

const cleanupModal = ({ restoreFocus = true } = {}) => {
  if (listeningForKeyboard) {
    window.removeEventListener('keydown', handleKeyboard)
    listeningForKeyboard = false
  }
  if (modalActive.value) {
    document.body.style.overflow = savedBodyOverflow
    restoreBackground()
    modalActive.value = false
  }
  if (
    restoreFocus &&
    previousFocus instanceof HTMLElement &&
    previousFocus.isConnected
  ) {
    previousFocus.focus({ preventScroll: true })
  }
  previousFocus = null
}

const requestClose = () => {
  emit('close')
  cleanupModal()
}

const trapFocus = (event) => {
  const focusable = getFocusableElements()
  if (!focusable.length) {
    event.preventDefault()
    viewerRoot.value?.focus({ preventScroll: true })
    return
  }

  const first = focusable[0]
  const last = focusable.at(-1)
  const active = document.activeElement
  if (event.shiftKey && (active === first || !viewerRoot.value?.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (
    !event.shiftKey &&
    (active === last || !viewerRoot.value?.contains(active))
  ) {
    event.preventDefault()
    first.focus()
  }
}

const handleKeyboard = (event) => {
  if (event.defaultPrevented) return
  if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    trapFocus(event)
    return
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (isEditableTarget(event.target)) return

  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
  } else if (event.key === 'ArrowLeft' && previousItem.value) {
    event.preventDefault()
    navigateTo(previousItem.value)
  } else if (event.key === 'ArrowRight' && nextItem.value) {
    event.preventDefault()
    navigateTo(nextItem.value)
  } else if (event.key === '+' && canZoom.value) {
    event.preventDefault()
    zoomIn()
  } else if (event.key === '-' && canZoom.value) {
    event.preventDefault()
    zoomOut()
  }
}

watch(
  [() => props.item, () => sourceUrl.value],
  () => {
    resetZoom()
    imageFailed.value = false
    imageRenderKey.value += 1
  },
)

onMounted(() => {
  previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  savedBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  const root = viewerRoot.value
  backgroundStates = [...document.body.children]
    .filter(
      (element) =>
        element instanceof HTMLElement &&
        element !== root &&
        !element.contains(root),
    )
    .map((element) => {
      const supportsInert = 'inert' in element
      const state = {
        element,
        hadInertAttribute: element.hasAttribute('inert'),
        supportsInert,
        inertValue: supportsInert ? element.inert : undefined,
      }
      element.setAttribute('inert', '')
      if (supportsInert) element.inert = true
      return state
    })

  modalActive.value = true
  window.addEventListener('keydown', handleKeyboard)
  listeningForKeyboard = true
  nextTick(() => {
    const first = getFocusableElements()[0]
    ;(first || viewerRoot.value)?.focus({ preventScroll: true })
  })
})

onBeforeUnmount(() => {
  cleanupModal()
})
</script>

<template>
  <Teleport to="body">
    <section
      ref="viewerRoot"
      class="artifact-viewer"
      role="dialog"
      :aria-modal="modalActive ? 'true' : undefined"
      :aria-labelledby="titleId"
      tabindex="-1"
    >
    <header class="artifact-viewer__header">
      <div class="artifact-viewer__heading">
        <div class="artifact-viewer__eyebrow">
          <span>证据查看器</span>
          <span v-if="hasDemoMark" class="artifact-viewer__demo">示例数据</span>
        </div>
        <h2 :id="titleId">{{ title }}</h2>
      </div>

      <div class="artifact-viewer__header-actions">
        <a
          v-if="item"
          class="artifact-viewer__icon-button"
          :href="sourceUrl"
          download
          aria-label="下载原文件"
          title="下载原文件"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" />
          </svg>
        </a>
        <a
          v-if="item"
          class="artifact-viewer__icon-button"
          :href="sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="在新窗口打开"
          title="在新窗口打开"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M20 4l-9 9" />
            <path d="M18 13v6H5V6h6" />
          </svg>
        </a>
        <button
          type="button"
          class="artifact-viewer__icon-button"
          aria-label="关闭查看器"
          title="关闭（Esc）"
          @click="requestClose"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 5 14 14M19 5 5 19" />
          </svg>
        </button>
      </div>
    </header>

    <div v-if="item" class="artifact-viewer__workspace">
      <main class="artifact-viewer__main">
        <div class="artifact-viewer__canvas-toolbar" aria-label="图像工具">
          <div class="artifact-viewer__navigation">
            <button
              type="button"
              aria-label="上一张证据"
              title="上一张（←）"
              :disabled="!previousItem"
              @click="navigateTo(previousItem)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <span class="artifact-viewer__position">
              {{
                currentIndex >= 0
                  ? `${currentIndex + 1} / ${items.length}`
                  : '独立查看'
              }}
            </span>
            <button
              type="button"
              aria-label="下一张证据"
              title="下一张（→）"
              :disabled="!nextItem"
              @click="navigateTo(nextItem)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </div>

          <div
            v-if="canZoom"
            class="artifact-viewer__zoom"
            data-testid="zoom-controls"
          >
            <button
              type="button"
              aria-label="缩小"
              title="缩小（-）"
              :disabled="zoom <= MIN_ZOOM"
              @click="zoomOut"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 12h12" />
              </svg>
            </button>
            <output data-testid="zoom-value" aria-live="polite">
              {{ zoom }}%
            </output>
            <button
              type="button"
              aria-label="放大"
              title="放大（+）"
              :disabled="zoom >= MAX_ZOOM"
              @click="zoomIn"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 6v12M6 12h12" />
              </svg>
            </button>
            <button
              type="button"
              class="artifact-viewer__reset"
              aria-label="重置缩放"
              @click="resetZoom"
            >
              重置
            </button>
          </div>
        </div>

        <div
          class="artifact-viewer__canvas"
          data-testid="artifact-canvas"
          :class="{ 'artifact-viewer__canvas--document': isPdf }"
        >
          <div
            v-if="canZoom"
            class="artifact-viewer__image-wrap"
            data-testid="zoom-surface"
            :style="zoomSurfaceStyle"
          >
            <img
              :key="imageRenderKey"
              :src="sourceUrl"
              :alt="`${title}大图预览`"
              :style="zoomImageStyle"
              data-testid="viewer-image"
              @error="imageFailed = true"
            />
          </div>

          <StatePanel
            v-else-if="isImage"
            state="error"
            title="图像无法显示"
            description="原始文件仍可下载，或在新窗口中尝试打开。"
            action-label="重试显示图像"
            @action="retryImage"
          />

          <object
            v-else-if="isPdf"
            :data="sourceUrl"
            type="application/pdf"
            data-testid="pdf-preview"
            :aria-label="`${title} PDF 预览`"
          >
            <p>
              无法内嵌预览时，
              <a :href="sourceUrl" target="_blank" rel="noopener noreferrer">
                请在新窗口打开 PDF
              </a>
              。
            </p>
          </object>

          <div v-else class="artifact-viewer__file-fallback">
            <span aria-hidden="true">FILE</span>
            <h3>此文件没有图像预览</h3>
            <p>可下载原文件，或在新窗口交给系统中的对应程序打开。</p>
          </div>
        </div>
      </main>

      <aside class="artifact-viewer__aside" aria-label="证据上下文">
        <div class="artifact-viewer__summary">
          <p v-if="item.description">{{ item.description }}</p>
          <p v-else>该产物尚未记录说明，请结合阶段与参数谨慎解读。</p>
        </div>

        <dl v-if="metadata.length" class="artifact-viewer__metadata">
          <div v-for="entry in metadata" :key="entry.label">
            <dt>{{ entry.label }}</dt>
            <dd>{{ entry.value }}</dd>
          </div>
        </dl>

        <nav class="artifact-viewer__panels" aria-label="快速查看相关面板">
          <div class="artifact-viewer__section-label">保持图像，辅助查看</div>
          <button
            v-for="panel in panelLinks"
            :key="panel.key"
            type="button"
            :data-panel="panel.key"
            @click="emit('show-panel', panel.key)"
          >
            <span aria-hidden="true">{{ panel.mark }}</span>
            {{ panel.label }}
          </button>
        </nav>

        <details v-if="item.path" class="artifact-viewer__path">
          <summary>原始路径</summary>
          <code>{{ item.path }}</code>
        </details>

        <p class="artifact-viewer__shortcuts">
          Esc 关闭 · ← → 切换<span v-if="canZoom"> · + − 缩放</span>
        </p>
      </aside>
    </div>

    <StatePanel
      v-else
      class="artifact-viewer__missing"
      state="empty"
      title="尚未选择证据"
      description="从画廊中打开一项研究产物。"
    />
    </section>
  </Teleport>
</template>

<style scoped>
.artifact-viewer {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  color: var(--color-surface, #f8faf7);
  background:
    linear-gradient(rgba(136, 185, 181, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(136, 185, 181, 0.035) 1px, transparent 1px),
    var(--color-frame, #0a222c);
  background-size: 28px 28px;
  outline: none;
}

.artifact-viewer__header {
  display: flex;
  flex: none;
  gap: var(--space-5, 1.25rem);
  align-items: center;
  justify-content: space-between;
  min-height: 5.25rem;
  padding: var(--space-4, 1rem) var(--space-6, 1.5rem);
  background: rgba(8, 29, 38, 0.94);
  border-bottom: 1px solid rgba(165, 204, 200, 0.18);
  backdrop-filter: blur(14px);
}

.artifact-viewer__heading {
  min-width: 0;
}

.artifact-viewer__eyebrow {
  display: flex;
  gap: var(--space-3, 0.75rem);
  align-items: center;
  margin-bottom: var(--space-1, 0.25rem);
  color: #91b7b4;
  font-size: var(--text-xs, 0.75rem);
  font-weight: 650;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.artifact-viewer__demo {
  padding: 0.15rem 0.45rem;
  color: #f0c879;
  letter-spacing: 0.04em;
  text-transform: none;
  background: rgba(197, 137, 48, 0.14);
  border: 1px solid rgba(221, 183, 110, 0.4);
  border-radius: var(--radius-pill, 999px);
}

.artifact-viewer h2 {
  max-width: min(68vw, 68rem);
  margin: 0;
  overflow: hidden;
  color: #f7f7f1;
  font-family: var(--font-display, Bahnschrift, "Microsoft YaHei", sans-serif);
  font-size: clamp(1.05rem, 1.8vw, 1.45rem);
  font-weight: 550;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-viewer__header-actions {
  display: flex;
  flex: none;
  gap: var(--space-2, 0.5rem);
}

.artifact-viewer__icon-button,
.artifact-viewer__canvas-toolbar button {
  display: inline-grid;
  place-items: center;
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  color: #d9e5e1;
  font: inherit;
  background: rgba(239, 247, 242, 0.06);
  border: 1px solid rgba(173, 205, 201, 0.2);
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition:
    color var(--motion-fast, 140ms) ease,
    background-color var(--motion-fast, 140ms) ease,
    border-color var(--motion-fast, 140ms) ease;
}

.artifact-viewer__icon-button:hover,
.artifact-viewer__canvas-toolbar button:hover:not(:disabled) {
  color: #ffffff;
  background: rgba(19, 129, 119, 0.22);
  border-color: rgba(109, 193, 183, 0.5);
}

.artifact-viewer__icon-button svg,
.artifact-viewer__canvas-toolbar button svg {
  width: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.artifact-viewer__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem);
  flex: 1;
  min-height: 0;
}

.artifact-viewer__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: var(--space-4, 1rem);
}

.artifact-viewer__canvas-toolbar {
  display: flex;
  flex: none;
  gap: var(--space-4, 1rem);
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-3, 0.75rem);
}

.artifact-viewer__navigation,
.artifact-viewer__zoom {
  display: flex;
  gap: var(--space-2, 0.5rem);
  align-items: center;
}

.artifact-viewer__canvas-toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.artifact-viewer__position,
.artifact-viewer__zoom output {
  min-width: 4.25rem;
  color: #aec5c2;
  font-family: var(--font-mono, Consolas, monospace);
  font-size: var(--text-xs, 0.75rem);
  text-align: center;
}

.artifact-viewer__canvas-toolbar .artifact-viewer__reset {
  width: auto;
  padding-inline: var(--space-3, 0.75rem);
  font-size: var(--text-xs, 0.75rem);
}

.artifact-viewer__canvas {
  position: relative;
  display: block;
  flex: 1;
  min-height: 24rem;
  overflow: auto;
  background:
    linear-gradient(45deg, rgba(11, 62, 72, 0.022) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(11, 62, 72, 0.022) 25%, transparent 25%),
    var(--color-canvas, #edf2ef);
  background-position:
    0 0,
    0 12px;
  background-size: 24px 24px;
  border: 1px solid rgba(180, 207, 202, 0.28);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-canvas, 0 24px 65px rgba(0, 12, 18, 0.32));
  overscroll-behavior: contain;
}

.artifact-viewer__image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100%;
  min-height: 100%;
  padding: clamp(1rem, 3vw, 3rem);
}

.artifact-viewer__image-wrap img {
  display: block;
  flex: none;
  max-width: none;
  max-height: none;
  height: auto;
  object-fit: contain;
}

.artifact-viewer__canvas object {
  width: 100%;
  min-height: 100%;
  color: var(--color-ink, #17252e);
  background: var(--color-surface-warm, #fffdf8);
  border: 0;
}

.artifact-viewer__canvas object p {
  padding: var(--space-8, 2rem);
}

.artifact-viewer__canvas object a {
  color: var(--color-accent-ink, #075e57);
  text-decoration: underline;
}

.artifact-viewer__file-fallback {
  display: grid;
  place-items: center;
  align-content: center;
  padding: var(--space-8, 2rem);
  color: var(--color-ink-muted, #65757a);
  text-align: center;
}

.artifact-viewer__file-fallback > span {
  display: grid;
  place-items: center;
  width: 5.5rem;
  height: 6.8rem;
  color: var(--color-accent-ink, #075e57);
  font-family: var(--font-mono, Consolas, monospace);
  letter-spacing: 0.08em;
  border: 1px solid var(--color-accent-border, #91c7bf);
  border-radius: 5px 18px 5px 5px;
}

.artifact-viewer__file-fallback h3 {
  margin: var(--space-5, 1.25rem) 0 0;
  color: var(--color-ink, #17252e);
}

.artifact-viewer__file-fallback p {
  max-width: 28rem;
  margin: var(--space-2, 0.5rem) 0 0;
  line-height: 1.65;
}

.artifact-viewer__aside {
  min-height: 0;
  padding: var(--space-6, 1.5rem);
  overflow: auto;
  color: var(--color-ink, #17252e);
  background: var(--color-surface-warm, #fffdf8);
  border-left: 1px solid var(--color-line, #dce4e2);
}

.artifact-viewer__summary {
  padding-bottom: var(--space-5, 1.25rem);
  border-bottom: 1px solid var(--color-line, #dce4e2);
}

.artifact-viewer__summary p {
  margin: 0;
  color: var(--color-ink-soft, #40545b);
  font-size: var(--text-sm, 0.875rem);
  line-height: 1.75;
}

.artifact-viewer__metadata {
  display: grid;
  gap: 0;
  margin: var(--space-5, 1.25rem) 0;
}

.artifact-viewer__metadata div {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: var(--space-3, 0.75rem);
  padding: var(--space-3, 0.75rem) 0;
  border-bottom: 1px solid var(--color-line-soft, #e8eeeb);
}

.artifact-viewer__metadata dt {
  color: var(--color-ink-muted, #65757a);
  font-size: var(--text-xs, 0.75rem);
}

.artifact-viewer__metadata dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-mono, Consolas, monospace);
  font-size: var(--text-sm, 0.875rem);
}

.artifact-viewer__section-label {
  grid-column: 1 / -1;
  margin-bottom: var(--space-1, 0.25rem);
  color: var(--color-ink-muted, #65757a);
  font-size: var(--text-xs, 0.75rem);
}

.artifact-viewer__panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2, 0.5rem);
  padding: var(--space-5, 1.25rem) 0;
  border-block: 1px solid var(--color-line, #dce4e2);
}

.artifact-viewer__panels button {
  display: flex;
  gap: var(--space-2, 0.5rem);
  align-items: center;
  min-height: 2.7rem;
  padding: var(--space-2, 0.5rem);
  color: var(--color-ink-soft, #40545b);
  font: inherit;
  font-size: var(--text-sm, 0.875rem);
  background: var(--color-surface-muted, #f1f4f0);
  border: 1px solid var(--color-line, #dce4e2);
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition:
    background-color var(--motion-fast, 140ms) ease,
    border-color var(--motion-fast, 140ms) ease;
}

.artifact-viewer__panels button:hover {
  background: var(--color-accent-soft, #d9efeb);
  border-color: var(--color-accent-border, #91c7bf);
}

.artifact-viewer__panels button span {
  color: var(--color-accent-ink, #075e57);
  font-family: var(--font-mono, Consolas, monospace);
  font-size: 0.62rem;
  letter-spacing: 0.05em;
}

.artifact-viewer__path {
  margin-top: var(--space-5, 1.25rem);
  color: var(--color-ink-muted, #65757a);
  font-size: var(--text-xs, 0.75rem);
}

.artifact-viewer__path summary {
  width: max-content;
  cursor: pointer;
}

.artifact-viewer__path code {
  display: block;
  max-height: 7rem;
  padding: var(--space-3, 0.75rem);
  margin-top: var(--space-2, 0.5rem);
  overflow: auto;
  overflow-wrap: anywhere;
  color: var(--color-ink-soft, #40545b);
  white-space: pre-wrap;
  background: var(--color-surface-muted, #f1f4f0);
  border-radius: var(--radius-sm, 6px);
}

.artifact-viewer__shortcuts {
  margin: var(--space-6, 1.5rem) 0 0;
  color: var(--color-ink-faint, #89979a);
  font-family: var(--font-mono, Consolas, monospace);
  font-size: 0.68rem;
  line-height: 1.6;
}

.artifact-viewer__missing {
  flex: 1;
  margin: var(--space-5, 1.25rem);
}

@media (max-width: 1200px) {
  .artifact-viewer {
    overflow: auto;
  }

  .artifact-viewer__workspace {
    grid-template-columns: 1fr;
  }

  .artifact-viewer__main {
    min-height: 64vh;
  }

  .artifact-viewer__aside {
    overflow: visible;
    border-top: 1px solid var(--color-line, #dce4e2);
    border-left: 0;
  }
}

@media (max-width: 768px) {
  .artifact-viewer__header {
    min-height: auto;
    padding: var(--space-3, 0.75rem);
  }

  .artifact-viewer h2 {
    max-width: 54vw;
  }

  .artifact-viewer__header-actions {
    gap: var(--space-1, 0.25rem);
  }

  .artifact-viewer__icon-button {
    min-width: 2.25rem;
    height: 2.25rem;
  }

  .artifact-viewer__main {
    min-height: 72vh;
    padding: var(--space-2, 0.5rem);
  }

  .artifact-viewer__canvas-toolbar {
    align-items: flex-start;
  }

  .artifact-viewer__zoom {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .artifact-viewer__canvas {
    min-height: 28rem;
  }

  .artifact-viewer__image-wrap {
    padding: var(--space-3, 0.75rem);
  }

  .artifact-viewer__aside {
    padding: var(--space-5, 1.25rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .artifact-viewer__icon-button,
  .artifact-viewer__canvas-toolbar button,
  .artifact-viewer__image-wrap img,
  .artifact-viewer__panels button {
    transition: none;
  }
}
</style>
