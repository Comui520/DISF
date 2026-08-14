<script setup>
import { computed, ref, watch } from 'vue'

import StatePanel from '../common/StatePanel.vue'
import { isLibraryImage } from '../../utils/artifacts.js'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  urlFor: {
    type: Function,
    required: true,
  },
  formatClass: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['open'])

const failedImages = ref(new Set())

const stageLabels = {
  subarch: '相似子架构',
  causal: '因果干预',
  fuzzing: '因果模糊测试',
  guide: '说明材料',
  uncategorized: '未分类',
}

const kindLabels = {
  general: '其它图片',
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

const visibleItems = computed(() =>
  (Array.isArray(props.items) ? props.items : []).filter(isLibraryImage),
)

const itemKey = (item, index) => item.id ?? item.path ?? item.name ?? index
const imageFailed = (item, index) =>
  failedImages.value.has(String(itemKey(item, index)))
const markImageFailed = (item, index) => {
  const next = new Set(failedImages.value)
  next.add(String(itemKey(item, index)))
  failedImages.value = next
}
const retryImage = (item, index) => {
  const next = new Set(failedImages.value)
  next.delete(String(itemKey(item, index)))
  failedImages.value = next
}

const readableTitle = (item) => item?.title || item?.name || '未命名图片'
const readableStage = (stage) => stageLabels[stage] || stage || '未分阶段'
const readableKind = (kind) => kindLabels[kind] || kind || '图片'
const classPair = (item) => {
  const hasA = item?.classA !== null && item?.classA !== undefined
  const hasB = item?.classB !== null && item?.classB !== undefined
  const label = (id) =>
    typeof props.formatClass === 'function'
      ? props.formatClass(id) || String(id)
      : String(id)
  if (hasA && hasB) return `${label(item.classA)} ↔ ${label(item.classB)}`
  if (hasA) return label(item.classA)
  if (hasB) return label(item.classB)
  return ''
}
const contextValues = (item) =>
  [item?.model, classPair(item), item?.layer].filter(Boolean)

const openItem = (item) => emit('open', item)

watch(
  [() => props.items, () => props.urlFor],
  () => {
    failedImages.value = new Set()
  },
  { deep: true },
)
</script>

<template>
  <StatePanel
    v-if="loading"
    state="loading"
    title="正在整理证据"
    description="正在按阶段载入主结果图索引。"
  />

  <StatePanel
    v-else-if="visibleItems.length === 0"
    state="empty"
    title="还没有图片"
    description="运行实验或切换阶段、主图/其它图片后再来查看。"
  />

  <section
    v-else
    class="artifact-gallery"
    aria-label="研究证据画廊"
    data-testid="artifact-grid"
  >
    <article
      v-for="(item, index) in visibleItems"
      :key="itemKey(item, index)"
      class="artifact-card"
      :data-artifact-id="item.id"
      data-testid="artifact-card"
    >
      <button
        type="button"
        class="artifact-card__open"
        data-testid="artifact-open"
        :aria-label="`查看${readableTitle(item)}`"
        @click="openItem(item)"
      >
        <div class="artifact-card__media">
          <img
            v-if="!imageFailed(item, index)"
            :src="urlFor(item)"
            :alt="`${readableTitle(item)}预览`"
            loading="lazy"
            decoding="async"
            @error="markImageFailed(item, index)"
          />

          <div
            v-else
            class="artifact-card__fallback"
            role="status"
            aria-live="polite"
            :aria-label="`${readableTitle(item)}图像载入失败`"
          >
            <span>图像载入失败</span>
          </div>
        </div>

        <div class="artifact-card__body">
          <div class="artifact-card__eyebrow">
            <span>{{ readableStage(item.stage) }}</span>
            <span aria-hidden="true">/</span>
            <span>{{ readableKind(item.kind) }}</span>
          </div>

          <h2>{{ readableTitle(item) }}</h2>

          <ul
            v-if="contextValues(item).length"
            class="artifact-card__context"
            aria-label="研究上下文"
          >
            <li v-for="value in contextValues(item)" :key="value">
              {{ value }}
            </li>
          </ul>
        </div>
      </button>

      <button
        v-if="imageFailed(item, index)"
        type="button"
        class="artifact-card__retry"
        :aria-label="`重试载入${readableTitle(item)}`"
        @click="retryImage(item, index)"
      >
        重试载入图像
      </button>
    </article>
  </section>
</template>

<style scoped>
.artifact-gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5, 1.25rem);
}

.artifact-card {
  min-width: 0;
  overflow: hidden;
  color: var(--color-ink, #17252e);
  background: var(--color-surface, #f8faf7);
  border: 1px solid var(--color-line, #dce4e2);
  border-radius: var(--radius-md, 10px);
  transition:
    border-color var(--motion-fast, 140ms) ease,
    box-shadow var(--motion-medium, 180ms) ease;
}

.artifact-card:hover {
  border-color: var(--color-accent-border, #91c7bf);
  box-shadow: var(--shadow-sm, 0 8px 24px rgba(13, 35, 43, 0.06));
}

.artifact-card__open {
  display: block;
  width: 100%;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.artifact-card__media {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--color-canvas, #edf2ef);
  border-bottom: 1px solid var(--color-line, #dce4e2);
}

.artifact-card__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}

.artifact-card__fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--color-ink-muted, #65757a);
  font-size: var(--text-sm, 0.875rem);
}

.artifact-card__body {
  padding: var(--space-3, 0.75rem);
}

.artifact-card__eyebrow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
  color: var(--color-accent-ink, #075e57);
  font-size: var(--text-xs, 0.75rem);
  font-weight: 650;
}

.artifact-card h2 {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-display, Bahnschrift, "Microsoft YaHei", sans-serif);
  font-size: var(--text-base, 1rem);
  font-weight: 620;
  line-height: 1.4;
}

.artifact-card__context {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0;
  margin: 0.55rem 0 0;
  list-style: none;
}

.artifact-card__context li {
  max-width: 100%;
  padding: 0.15rem 0.4rem;
  overflow: hidden;
  color: var(--color-ink-soft, #40545b);
  font-family: var(--font-mono, Consolas, monospace);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--color-surface-muted, #f1f4f0);
  border-radius: var(--radius-sm, 6px);
}

.artifact-card__retry {
  display: block;
  width: calc(100% - 1.5rem);
  min-height: 2rem;
  margin: 0 0.75rem 0.75rem;
  color: var(--color-accent-ink, #075e57);
  font: inherit;
  font-size: var(--text-xs, 0.75rem);
  background: var(--color-accent-soft, #d9efeb);
  border: 1px solid var(--color-accent-border, #91c7bf);
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
}

@media (max-width: 900px) {
  .artifact-gallery {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .artifact-card {
    transition: none;
  }
}
</style>
