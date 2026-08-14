<script setup>
import { computed } from 'vue'

const props = defineProps({
  context: {
    type: Object,
    default: () => ({}),
  },
  isDemo: {
    type: Boolean,
    default: false,
  },
  stages: {
    type: Array,
    default: () => [],
  },
  formatClass: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['stage-change', 'clear-pair'])

const normalizedStages = computed(() =>
  props.stages
    .filter(Boolean)
    .map((stage, index) =>
      typeof stage === 'string'
        ? { key: stage, name: stage, order: index + 1 }
        : {
            ...stage,
            key: stage.key ?? stage.id ?? String(index),
            name: stage.name ?? stage.label ?? stage.key ?? `阶段 ${index + 1}`,
            order: stage.order ?? index + 1,
          },
    ),
)

const hasClassA = computed(
  () => props.context?.classA !== null && props.context?.classA !== undefined,
)
const hasClassB = computed(
  () => props.context?.classB !== null && props.context?.classB !== undefined,
)
const hasPair = computed(() => hasClassA.value || hasClassB.value)
const pairLabel = computed(() => {
  const label = (id) =>
    typeof props.formatClass === 'function'
      ? props.formatClass(id) || String(id)
      : String(id)
  if (hasClassA.value && hasClassB.value) {
    return `${label(props.context.classA)} ↔ ${label(props.context.classB)}`
  }
  if (hasClassA.value) return label(props.context.classA)
  if (hasClassB.value) return label(props.context.classB)
  return ''
})
</script>

<template>
  <section class="evidence-context" aria-label="当前研究上下文">
    <div class="evidence-context__current">
      <div class="evidence-context__label">
        <span class="evidence-context__pulse" aria-hidden="true" />
        当前上下文
        <span v-if="isDemo" class="evidence-context__demo">示例数据</span>
      </div>

      <div class="evidence-context__values">
        <span class="evidence-context__value">
          <small>模型</small>
          <strong>{{ context.model || '全部模型' }}</strong>
        </span>

        <span v-if="pairLabel" class="evidence-context__value">
          <small>类别对</small>
          <strong>{{ pairLabel }}</strong>
          <button
            type="button"
            class="evidence-context__clear"
            aria-label="清除类别对"
            title="清除类别对"
            @click="emit('clear-pair')"
          >
            ×
          </button>
        </span>

        <span v-if="context.layer" class="evidence-context__value">
          <small>网络层</small>
          <strong>{{ context.layer }}</strong>
        </span>
      </div>
    </div>

    <nav
      v-if="normalizedStages.length"
      class="evidence-context__stages"
      aria-label="研究阶段，可直接跳转"
    >
      <button
        v-for="stage in normalizedStages"
        :key="stage.key"
        type="button"
        :data-stage="stage.key"
        :aria-current="context.stage === stage.key ? 'step' : undefined"
        :title="stage.description || `查看${stage.name}`"
        @click="emit('stage-change', stage.key)"
      >
        <span class="evidence-context__node" aria-hidden="true">
          {{ String(stage.order).padStart(2, '0') }}
        </span>
        <span>{{ stage.name }}</span>
      </button>
    </nav>
  </section>
</template>

<style scoped>
.evidence-context {
  display: grid;
  grid-template-columns: minmax(15rem, auto) minmax(0, 1fr);
  gap: var(--space-6, 1.5rem);
  align-items: center;
  padding: var(--space-4, 1rem) var(--space-5, 1.25rem);
  color: var(--color-ink, #17252e);
  background: rgba(255, 253, 248, 0.94);
  border: 1px solid var(--color-line, #dce4e2);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-sm, 0 8px 24px rgba(13, 35, 43, 0.06));
  backdrop-filter: blur(12px);
}

.evidence-context__current {
  min-width: 0;
}

.evidence-context__label {
  display: flex;
  gap: var(--space-2, 0.5rem);
  align-items: center;
  margin-bottom: var(--space-2, 0.5rem);
  color: var(--color-ink-muted, #65757a);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.08em;
}

.evidence-context__pulse {
  width: 0.45rem;
  height: 0.45rem;
  background: var(--color-accent, #0b7f75);
  border-radius: 50%;
  box-shadow: 0 0 0 4px var(--color-accent-soft, #d9efeb);
}

.evidence-context__demo {
  padding: 0.12rem 0.4rem;
  color: var(--color-amber-ink, #7c5015);
  letter-spacing: 0.02em;
  background: var(--color-amber-soft, #fbefd5);
  border: 1px solid var(--color-amber-border, #ddb76e);
  border-radius: var(--radius-pill, 999px);
}

.evidence-context__values {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 0.5rem);
}

.evidence-context__value {
  display: inline-flex;
  gap: var(--space-2, 0.5rem);
  align-items: center;
  max-width: 100%;
  min-height: 2rem;
  padding: 0.3rem 0.55rem;
  background: var(--color-surface-muted, #f1f4f0);
  border: 1px solid var(--color-line, #dce4e2);
  border-radius: var(--radius-md, 10px);
}

.evidence-context__value small {
  color: var(--color-ink-muted, #65757a);
  font-size: 0.65rem;
}

.evidence-context__value strong {
  overflow: hidden;
  font-family: var(--font-mono, Consolas, monospace);
  font-size: var(--text-xs, 0.75rem);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evidence-context__clear {
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  color: var(--color-ink-muted, #65757a);
  font: inherit;
  line-height: 1;
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.evidence-context__clear:hover {
  color: var(--color-danger, #a33b35);
  background: var(--color-danger-soft, #f7e4e1);
}

.evidence-context__stages {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  gap: var(--space-2, 0.5rem);
  min-width: 0;
}

.evidence-context__stages::before {
  position: absolute;
  top: 1.03rem;
  right: 5%;
  left: 5%;
  height: 1px;
  content: "";
  background: var(--color-line-strong, #cad5d3);
}

.evidence-context__stages button {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-2, 0.5rem);
  align-items: center;
  min-width: 0;
  min-height: 2.1rem;
  padding: 0.2rem 0.45rem 0.2rem 0.2rem;
  color: var(--color-ink-muted, #65757a);
  font: inherit;
  font-size: var(--text-xs, 0.75rem);
  text-align: left;
  background: var(--color-surface-warm, #fffdf8);
  border: 1px solid transparent;
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition:
    color var(--motion-fast, 140ms) ease,
    border-color var(--motion-fast, 140ms) ease;
}

.evidence-context__stages button:hover {
  color: var(--color-accent-ink, #075e57);
  border-color: var(--color-accent-border, #91c7bf);
}

.evidence-context__stages button[aria-current="step"] {
  color: var(--color-accent-ink, #075e57);
  font-weight: 650;
}

.evidence-context__node {
  display: grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  color: var(--color-ink-muted, #65757a);
  font-family: var(--font-mono, Consolas, monospace);
  font-size: 0.6rem;
  background: var(--color-surface-muted, #f1f4f0);
  border: 1px solid var(--color-line-strong, #cad5d3);
  border-radius: 50%;
}

button[aria-current="step"] .evidence-context__node {
  color: #ffffff;
  background: var(--color-accent, #0b7f75);
  border-color: var(--color-accent, #0b7f75);
  box-shadow: 0 0 0 4px var(--color-accent-soft, #d9efeb);
}

@media (max-width: 1200px) {
  .evidence-context {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .evidence-context {
    gap: var(--space-4, 1rem);
    padding: var(--space-4, 1rem);
  }

  .evidence-context__stages {
    display: flex;
    padding: 0.25rem;
    overflow-x: auto;
    scroll-snap-type: x proximity;
  }

  .evidence-context__stages::before {
    display: none;
  }

  .evidence-context__stages button {
    flex: 0 0 auto;
    min-width: 8.5rem;
    scroll-snap-align: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .evidence-context__stages button {
    transition: none;
  }
}
</style>
