<script setup>
import { computed } from 'vue'

const props = defineProps({
  state: {
    type: String,
    required: true,
    validator: (value) => ['loading', 'empty', 'error'].includes(value),
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  actionLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['action', 'retry'])

const fallbackCopy = {
  loading: {
    title: '正在载入',
    description: '请稍候，内容正在准备中。',
  },
  empty: {
    title: '暂时没有内容',
    description: '调整条件后再来看看。',
  },
  error: {
    title: '内容载入失败',
    description: '请稍后重试。',
  },
}

const resolvedTitle = computed(
  () => props.title || fallbackCopy[props.state].title,
)
const resolvedDescription = computed(
  () => props.description || fallbackCopy[props.state].description,
)

const handleAction = () => {
  emit('action')
  if (props.state === 'error') {
    emit('retry')
  }
}
</script>

<template>
  <section
    class="state-panel"
    :class="`state-panel--${state}`"
    :role="state === 'error' ? 'alert' : 'status'"
    :aria-live="state === 'error' ? 'assertive' : 'polite'"
    :aria-busy="state === 'loading' ? 'true' : 'false'"
  >
    <div
      class="state-panel__visual"
      data-testid="state-visual"
      aria-hidden="true"
    >
      <div v-if="state === 'loading'" class="state-panel__skeleton">
        <span
          v-for="line in 3"
          :key="line"
          class="state-panel__skeleton-line"
          data-testid="skeleton-line"
        />
      </div>

      <svg
        v-else-if="state === 'empty'"
        class="state-panel__icon"
        viewBox="0 0 48 48"
      >
        <path d="M8 15.5h12l3.5 4H40v17H8z" />
        <path d="M8 15.5v-4h12l3.5 4H40v4" />
        <path d="M17 28h14" />
      </svg>

      <svg v-else class="state-panel__icon" viewBox="0 0 48 48">
        <path d="M24 7 42 39H6z" />
        <path d="M24 18v10" />
        <circle cx="24" cy="34" r="1.4" />
      </svg>
    </div>

    <div class="state-panel__copy">
      <h2>{{ resolvedTitle }}</h2>
      <p>{{ resolvedDescription }}</p>
    </div>

    <button
      v-if="actionLabel"
      type="button"
      class="state-panel__action"
      :aria-label="actionLabel"
      @click="handleAction"
    >
      {{ actionLabel }}
    </button>
  </section>
</template>

<style scoped>
.state-panel {
  display: grid;
  place-items: center;
  min-height: 16rem;
  padding: var(--space-8, 2rem);
  color: var(--color-ink, #17252e);
  text-align: center;
  background:
    linear-gradient(rgba(22, 52, 61, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(22, 52, 61, 0.025) 1px, transparent 1px),
    var(--color-surface-warm, #fffdf8);
  background-size: 24px 24px;
  border: 1px dashed var(--color-line-strong, #cad5d3);
  border-radius: var(--radius-lg, 16px);
}

.state-panel__visual {
  display: grid;
  place-items: center;
  width: 8.5rem;
  height: 5.5rem;
  margin-bottom: var(--space-5, 1.25rem);
  color: var(--color-accent, #0b7f75);
}

.state-panel__skeleton {
  width: 100%;
}

.state-panel__skeleton-line {
  display: block;
  height: 0.55rem;
  margin: 0.65rem 0;
  overflow: hidden;
  background: var(--color-line, #dce4e2);
  border-radius: var(--radius-pill, 999px);
}

.state-panel__skeleton-line::after {
  display: block;
  width: 45%;
  height: 100%;
  content: "";
  background: var(--color-accent-soft, #d9efeb);
  border-radius: inherit;
  animation: state-panel-scan 1.15s ease-in-out infinite alternate;
}

.state-panel__skeleton-line:nth-child(2) {
  width: 78%;
  margin-inline: auto;
}

.state-panel__skeleton-line:nth-child(3) {
  width: 58%;
  margin-inline: auto;
}

.state-panel__icon {
  width: 3.25rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.state-panel--error .state-panel__visual {
  color: var(--color-danger, #a33b35);
}

.state-panel__copy {
  max-width: 32rem;
}

.state-panel h2 {
  margin: 0;
  font-size: var(--text-lg, 1.125rem);
  font-weight: 650;
  letter-spacing: 0.01em;
}

.state-panel p {
  margin: var(--space-2, 0.5rem) 0 0;
  color: var(--color-ink-muted, #65757a);
  font-size: var(--text-sm, 0.875rem);
  line-height: 1.7;
}

.state-panel__action {
  min-height: 2.5rem;
  margin-top: var(--space-5, 1.25rem);
  padding: 0.55rem 1rem;
  color: var(--color-accent-ink, #075e57);
  font: inherit;
  font-weight: 650;
  background: var(--color-accent-soft, #d9efeb);
  border: 1px solid var(--color-accent-border, #91c7bf);
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition:
    transform var(--motion-fast, 140ms) ease,
    background-color var(--motion-fast, 140ms) ease;
}

.state-panel__action:hover {
  background: var(--color-accent-soft-strong, #c4e5df);
  transform: translateY(-1px);
}

@keyframes state-panel-scan {
  from {
    transform: translateX(-25%);
  }

  to {
    transform: translateX(150%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .state-panel__skeleton-line::after {
    animation: none;
  }
}
</style>
