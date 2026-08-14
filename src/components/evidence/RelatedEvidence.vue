<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
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
const visibleItems = computed(() =>
  Array.isArray(props.items) ? props.items.filter(Boolean) : [],
)

const itemKey = (item, index) => item.id ?? item.path ?? item.name ?? index
const titleFor = (item) => item?.title || item?.name || '未命名证据'
const contextLine = (item) => {
  const label = (id) =>
    typeof props.formatClass === 'function'
      ? props.formatClass(id) || String(id)
      : String(id)
  const hasA = Number.isFinite(item?.classA)
  const hasB = Number.isFinite(item?.classB)
  const pair =
    hasA && hasB
      ? `${label(item.classA)} ↔ ${label(item.classB)}`
      : hasA
        ? label(item.classA)
        : hasB
          ? label(item.classB)
          : ''
  return [item?.model, pair, item?.stage || item?.kind].filter(Boolean).join(' · ')
}
const isImage = (item) =>
  item?.isImage === true ||
  /\.(png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(
    String(item?.path || item?.name || ''),
  )
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
  <section
    v-if="visibleItems.length"
    class="related-evidence"
    aria-labelledby="related-evidence-title"
    data-testid="related-evidence"
  >
    <header>
      <div>
        <span>RELATED EVIDENCE</span>
        <h2 id="related-evidence-title">关联证据</h2>
      </div>
      <small>{{ visibleItems.length }} 项</small>
    </header>

    <div class="related-evidence__track">
      <article
        v-for="(item, index) in visibleItems"
        :key="itemKey(item, index)"
        class="related-evidence__item"
        data-testid="related-item"
      >
        <button
          type="button"
          class="related-evidence__open"
          data-testid="related-open"
          :aria-label="`打开${titleFor(item)}`"
          @click="openItem(item)"
        >
          <div class="related-evidence__thumb">
            <img
              v-if="isImage(item) && !imageFailed(item, index)"
              :src="urlFor(item)"
              :alt="`${titleFor(item)}缩略图`"
              loading="lazy"
              @error="markImageFailed(item, index)"
            />
            <span
              v-else-if="isImage(item)"
              role="status"
              aria-live="polite"
              :aria-label="`${titleFor(item)}图像载入失败`"
            >
              图像载入失败
            </span>
            <span v-else aria-hidden="true">FILE</span>
          </div>
          <div class="related-evidence__copy">
            <strong>{{ titleFor(item) }}</strong>
            <small>{{ contextLine(item) }}</small>
          </div>
        </button>

        <button
          v-if="isImage(item) && imageFailed(item, index)"
          type="button"
          class="related-evidence__retry"
          :aria-label="`重试载入${titleFor(item)}`"
          @click="retryImage(item, index)"
        >
          重试
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.related-evidence {
  color: var(--color-ink, #17252e);
}

.related-evidence > header {
  display: flex;
  gap: var(--space-4, 1rem);
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-3, 0.75rem);
}

.related-evidence > header span {
  display: block;
  margin-bottom: 0.12rem;
  color: var(--color-accent-ink, #075e57);
  font-family: var(--font-mono, Consolas, monospace);
  font-size: 0.62rem;
  font-weight: 650;
  letter-spacing: 0.1em;
}

.related-evidence h2 {
  margin: 0;
  font-family: var(--font-display, Bahnschrift, "Microsoft YaHei", sans-serif);
  font-size: var(--text-base, 1rem);
  font-weight: 620;
}

.related-evidence > header small {
  color: var(--color-ink-muted, #65757a);
  font-size: var(--text-xs, 0.75rem);
}

.related-evidence__track {
  display: grid;
  grid-auto-columns: minmax(13rem, 17rem);
  grid-auto-flow: column;
  gap: var(--space-3, 0.75rem);
  padding: 2px 2px var(--space-3, 0.75rem);
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: x proximity;
}

.related-evidence__item {
  min-width: 0;
  min-height: 5.25rem;
  overflow: hidden;
  background: var(--color-surface-warm, #fffdf8);
  border: 1px solid var(--color-line, #dce4e2);
  border-radius: var(--radius-md, 10px);
  box-shadow: var(--shadow-xs, 0 3px 12px rgba(13, 35, 43, 0.05));
  scroll-snap-align: start;
  transition:
    transform var(--motion-fast, 140ms) ease,
    border-color var(--motion-fast, 140ms) ease;
}

.related-evidence__item:hover {
  border-color: var(--color-accent-border, #91c7bf);
  transform: translateY(-1px);
}

.related-evidence__open {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: var(--space-3, 0.75rem);
  width: 100%;
  min-height: 5.25rem;
  padding: var(--space-2, 0.5rem);
  color: inherit;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.related-evidence__thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  overflow: hidden;
  color: var(--color-accent-ink, #075e57);
  font-family: var(--font-mono, Consolas, monospace);
  font-size: 0.62rem;
  letter-spacing: 0.05em;
  background:
    linear-gradient(rgba(11, 62, 72, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(11, 62, 72, 0.035) 1px, transparent 1px),
    var(--color-canvas, #edf2ef);
  background-size: 12px 12px;
  border: 1px solid var(--color-line, #dce4e2);
  border-radius: var(--radius-sm, 6px);
}

.related-evidence__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.related-evidence__thumb [role="status"] {
  padding: var(--space-1, 0.25rem);
  font-size: 0.58rem;
  line-height: 1.25;
  text-align: center;
}

.related-evidence__copy {
  display: grid;
  align-content: center;
  min-width: 0;
}

.related-evidence__copy strong,
.related-evidence__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-evidence__copy strong {
  font-size: var(--text-sm, 0.875rem);
  font-weight: 600;
}

.related-evidence__copy small {
  margin-top: var(--space-2, 0.5rem);
  color: var(--color-ink-muted, #65757a);
  font-size: var(--text-xs, 0.75rem);
}

.related-evidence__retry {
  width: calc(100% - var(--space-4, 1rem));
  min-height: 1.8rem;
  padding: 0.2rem 0.45rem;
  margin: 0 var(--space-2, 0.5rem) var(--space-2, 0.5rem);
  color: var(--color-accent-ink, #075e57);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 650;
  background: var(--color-accent-soft, #d9efeb);
  border: 1px solid var(--color-accent-border, #91c7bf);
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
}

@media (max-width: 768px) {
  .related-evidence__track {
    grid-auto-columns: minmax(12rem, 78vw);
  }
}

@media (prefers-reduced-motion: reduce) {
  .related-evidence__item {
    transition: none;
  }
}
</style>
