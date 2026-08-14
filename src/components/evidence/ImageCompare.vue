<script setup>
import { ref, watch } from 'vue'

import StatePanel from '../common/StatePanel.vue'

const props = defineProps({
  left: {
    type: Object,
    default: null,
  },
  right: {
    type: Object,
    default: null,
  },
  urlFor: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['swap'])

const failed = ref({ left: false, right: false })

watch(
  () => [props.left, props.right],
  () => {
    failed.value = { left: false, right: false }
  },
)

const titleFor = (item) => item?.title || item?.name || '未命名图像'
const emitSwap = () => {
  emit('swap', { left: props.right, right: props.left })
}
</script>

<template>
  <StatePanel
    v-if="!left || !right"
    state="empty"
    title="选择两张图像进行对比"
    description="分别指定左侧与右侧证据后，这里会保持原比例并排呈现。"
  />

  <section
    v-else
    class="image-compare"
    aria-labelledby="image-compare-title"
    data-testid="image-compare"
  >
    <header class="image-compare__header">
      <div>
        <span class="image-compare__eyebrow">Evidence comparison</span>
        <h2 id="image-compare-title">证据图像对比</h2>
      </div>
      <button
        type="button"
        class="image-compare__swap"
        aria-label="交换左右图像"
        @click="emitSwap"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7h12l-3-3m3 3-3 3M17 17H5l3 3m-3-3 3-3" />
        </svg>
        交换
      </button>
    </header>

    <div class="image-compare__grid">
      <figure>
        <div class="image-compare__label">
          <span>LEFT</span>
          <h3>左侧 · {{ titleFor(left) }}</h3>
        </div>
        <div class="image-compare__canvas">
          <img
            v-if="!failed.left"
            :src="urlFor(left)"
            :alt="`左侧图像：${titleFor(left)}`"
            @error="failed.left = true"
          />
          <div
            v-else
            class="image-compare__fallback"
            role="status"
            aria-live="polite"
            :aria-label="`左侧图像：${titleFor(left)}载入失败`"
            data-testid="left-image-fallback"
          >
            左侧图像载入失败
          </div>
        </div>
        <figcaption>
          {{ left.description || '左侧研究产物' }}
        </figcaption>
      </figure>

      <figure>
        <div class="image-compare__label">
          <span>RIGHT</span>
          <h3>右侧 · {{ titleFor(right) }}</h3>
        </div>
        <div class="image-compare__canvas">
          <img
            v-if="!failed.right"
            :src="urlFor(right)"
            :alt="`右侧图像：${titleFor(right)}`"
            @error="failed.right = true"
          />
          <div
            v-else
            class="image-compare__fallback"
            role="status"
            aria-live="polite"
            :aria-label="`右侧图像：${titleFor(right)}载入失败`"
            data-testid="right-image-fallback"
          >
            右侧图像载入失败
          </div>
        </div>
        <figcaption>
          {{ right.description || '右侧研究产物' }}
        </figcaption>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.image-compare {
  overflow: hidden;
  color: var(--color-ink, #17252e);
  background: var(--color-surface-warm, #fffdf8);
  border: 1px solid var(--color-line, #dce4e2);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm, 0 8px 24px rgba(13, 35, 43, 0.06));
}

.image-compare__header {
  display: flex;
  gap: var(--space-5, 1.25rem);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5, 1.25rem) var(--space-6, 1.5rem);
  border-bottom: 1px solid var(--color-line, #dce4e2);
}

.image-compare__eyebrow {
  display: block;
  margin-bottom: var(--space-1, 0.25rem);
  color: var(--color-accent-ink, #075e57);
  font-family: var(--font-mono, Consolas, monospace);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.image-compare h2,
.image-compare h3 {
  margin: 0;
  font-family: var(--font-display, Bahnschrift, "Microsoft YaHei", sans-serif);
}

.image-compare h2 {
  font-size: var(--text-lg, 1.125rem);
  font-weight: 620;
}

.image-compare__swap {
  display: inline-flex;
  gap: var(--space-2, 0.5rem);
  align-items: center;
  min-height: 2.5rem;
  padding: 0.5rem 0.8rem;
  color: var(--color-accent-ink, #075e57);
  font: inherit;
  font-size: var(--text-sm, 0.875rem);
  font-weight: 650;
  background: var(--color-accent-soft, #d9efeb);
  border: 1px solid var(--color-accent-border, #91c7bf);
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition:
    transform var(--motion-fast, 140ms) ease,
    background-color var(--motion-fast, 140ms) ease;
}

.image-compare__swap:hover {
  background: var(--color-accent-soft-strong, #c4e5df);
  transform: translateY(-1px);
}

.image-compare__swap svg {
  width: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.image-compare__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.image-compare figure {
  min-width: 0;
  margin: 0;
  padding: var(--space-5, 1.25rem);
}

.image-compare figure + figure {
  border-left: 1px solid var(--color-line, #dce4e2);
}

.image-compare__label {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3, 0.75rem);
  align-items: baseline;
  min-height: 2rem;
  margin-bottom: var(--space-3, 0.75rem);
}

.image-compare__label > span {
  color: var(--color-ink-faint, #89979a);
  font-family: var(--font-mono, Consolas, monospace);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
}

.image-compare h3 {
  overflow: hidden;
  font-size: var(--text-sm, 0.875rem);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-compare__canvas {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background:
    linear-gradient(rgba(11, 62, 72, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(11, 62, 72, 0.035) 1px, transparent 1px),
    var(--color-canvas, #edf2ef);
  background-size: 22px 22px;
  border: 1px solid var(--color-line, #dce4e2);
  border-radius: var(--radius-md, 10px);
}

.image-compare__canvas img {
  display: block;
  width: 100%;
  height: 100%;
  padding: var(--space-3, 0.75rem);
  object-fit: contain;
}

.image-compare__fallback {
  padding: var(--space-5, 1.25rem);
  color: var(--color-ink-muted, #65757a);
  font-size: var(--text-sm, 0.875rem);
  text-align: center;
}

.image-compare figcaption {
  min-height: 1.5rem;
  margin-top: var(--space-3, 0.75rem);
  overflow: hidden;
  color: var(--color-ink-muted, #65757a);
  font-size: var(--text-xs, 0.75rem);
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .image-compare__header {
    padding: var(--space-4, 1rem);
  }

  .image-compare__grid {
    grid-template-columns: 1fr;
  }

  .image-compare figure {
    padding: var(--space-4, 1rem);
  }

  .image-compare figure + figure {
    border-top: 1px solid var(--color-line, #dce4e2);
    border-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .image-compare__swap {
    transition: none;
  }
}
</style>
