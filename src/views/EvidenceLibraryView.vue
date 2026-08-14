<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { api } from '@/api'
import EvidenceContextBar from '@/components/evidence/EvidenceContextBar.vue'
import ArtifactGallery from '@/components/evidence/ArtifactGallery.vue'
import StatePanel from '@/components/common/StatePanel.vue'
import { RESEARCH_STAGES, LIBRARY_AUX_SECTIONS } from '@/constants/research.js'
import { useArtifactIndex } from '@/composables/useArtifactIndex.js'
import { useClassLabels } from '@/composables/useClassLabels.js'
import { useResearchContext } from '@/composables/useResearchContext.js'
import { useRegisteredModels } from '@/composables/useRegisteredModels.js'
import { mergeModelOptions } from '@/utils/models.js'
import {
  collectModels,
  collectPairs,
  filterLibraryArtifacts,
  workspaceLocation,
} from '@/utils/workspace.js'

const PAGE_SIZE = 24
const DEFAULT_LIBRARY_MODEL = 'vgg16'

const router = useRouter()
const route = useRoute()
const { context, updateContext } = useResearchContext()
const { formatClass } = useClassLabels()
const { models: registeredModels } = useRegisteredModels()

const lane = ref(route.query.lane === 'secondary' ? 'secondary' : 'primary')
const visibleCount = ref(PAGE_SIZE)

watch(
  () => route.query.model,
  (model) => {
    if (model === undefined) {
      updateContext({ model: DEFAULT_LIBRARY_MODEL }, { replace: true })
    }
  },
  { immediate: true },
)

const { items, loading, error, isDemo, refresh } = useArtifactIndex({
  net: () => context.value.model || DEFAULT_LIBRARY_MODEL,
  stage: () => context.value.stage || 'subarch',
  includeImageRoot: true,
  includeFuzzingApi: false,
  limit: 800,
  immediate: true,
})

watch(
  () => [context.value.stage, context.value.model, context.value.classA, context.value.classB, lane.value],
  () => {
    visibleCount.value = PAGE_SIZE
  },
)

const primaryItems = computed(() =>
  filterLibraryArtifacts(items.value, context.value, { lane: 'primary' }),
)
const secondaryItems = computed(() =>
  filterLibraryArtifacts(items.value, context.value, { lane: 'secondary' }),
)
const filteredItems = computed(() =>
  lane.value === 'secondary' ? secondaryItems.value : primaryItems.value,
)
const visibleItems = computed(() =>
  filteredItems.value.slice(0, visibleCount.value),
)
const hasMore = computed(
  () => visibleCount.value < filteredItems.value.length,
)

const modelOptions = computed(() =>
  mergeModelOptions(registeredModels.value, collectModels(items.value)),
)
const pairs = computed(() =>
  collectPairs(items.value, { formatClass }),
)
const auxCounts = computed(() =>
  Object.fromEntries(
    LIBRARY_AUX_SECTIONS.map((section) => [
      section.key,
      filterLibraryArtifacts(
        items.value,
        { ...context.value, stage: section.key },
        { lane: 'primary' },
      ).length,
    ]),
  ),
)

const galleryState = computed(() => {
  if (loading.value) return 'loading'
  if (error.value?.length && !filteredItems.value.length) return 'error'
  if (!filteredItems.value.length) return 'empty'
  return null
})

const emptyTitle = computed(() => {
  if (lane.value === 'secondary') return '这一阶段暂无其它图片'
  return '还没有可展示的主结果图'
})

const emptyDescription = computed(() => {
  if (route.query.missingPeer === '1') {
    return '当前案例在这一阶段还没有对应证据。可换模型/类别对，或从专家工具运行该阶段任务。'
  }
  if (lane.value === 'secondary') {
    return '主结果图之外的掩码、分类对比等会显示在这里。PDF 不会进入画廊。'
  }
  return '默认只展示各阶段主结果图（子架构优先 similar_subarch）。其它图片可切到「其它图片」查看。'
})

const urlFor = (item) =>
  api.fileUrl(item.previewPath || item.path || item.name || '')

const openArtifact = (item) => {
  if (!item) return
  router.push(
    workspaceLocation('case', {
      model: item.model || context.value.model,
      stage: item.stage || context.value.stage,
      classA: item.classA,
      classB: item.classB,
      artifact: item.path || item.id,
      panel: 'image',
    }),
  )
}

const onStageChange = (stage) => {
  updateContext({ stage }, { replace: true })
}

const onClearPair = () => {
  updateContext({ classA: null, classB: null }, { replace: true })
}

const onModelChange = (event) => {
  const value = event.target.value
  updateContext({ model: value || 'all' }, { replace: true })
}

const onPairChange = (event) => {
  const value = event.target.value
  if (!value) {
    updateContext({ classA: null, classB: null }, { replace: true })
    return
  }
  const [classA, classB] = value.split(':').map(Number)
  updateContext({ classA, classB }, { replace: true })
}

const setLane = (next) => {
  lane.value = next
  const query = { ...route.query }
  if (next === 'secondary') query.lane = 'secondary'
  else delete query.lane
  router.replace({ query })
}

const loadMore = () => {
  visibleCount.value += PAGE_SIZE
}

const selectedPairValue = computed(() => {
  if (
    !Number.isFinite(context.value.classA) ||
    !Number.isFinite(context.value.classB)
  ) {
    return ''
  }
  const [classA, classB] =
    context.value.classA <= context.value.classB
      ? [context.value.classA, context.value.classB]
      : [context.value.classB, context.value.classA]
  return `${classA}:${classB}`
})
</script>

<template>
  <div class="evidence-library" data-testid="evidence-library">
    <header class="evidence-library__hero">
      <div>
        <p class="evidence-library__eyebrow">IMAGE-FIRST RESEARCH</p>
        <h1>证据库</h1>
        <p>
          主画廊只展示实验主结果图。点进一张图后，再在案例工作区看关联证据、图表与参数。
        </p>
      </div>
      <div class="evidence-library__actions">
        <button type="button" class="evidence-library__ghost" @click="refresh">
          刷新索引
        </button>
        <router-link class="evidence-library__primary" to="/tasks">
          运行 NAD 任务
        </router-link>
      </div>
    </header>

    <EvidenceContextBar
      :context="context"
      :is-demo="isDemo"
      :stages="RESEARCH_STAGES"
      :format-class="formatClass"
      @stage-change="onStageChange"
      @clear-pair="onClearPair"
    />

    <div class="evidence-library__lanes" data-testid="library-lanes">
      <button
        type="button"
        data-testid="lane-primary"
        :class="{ 'is-active': lane === 'primary' }"
        @click="setLane('primary')"
      >
        主结果图
        <small>{{ primaryItems.length }}</small>
      </button>
      <button
        type="button"
        data-testid="lane-secondary"
        :class="{ 'is-active': lane === 'secondary' }"
        @click="setLane('secondary')"
      >
        其它图片
        <small>{{ secondaryItems.length }}</small>
      </button>
    </div>

    <div class="evidence-library__aux" data-testid="library-aux">
      <span class="evidence-library__aux-label">非实验流水线</span>
      <button
        v-for="section in LIBRARY_AUX_SECTIONS"
        :key="section.key"
        type="button"
        :data-section="section.key"
        :class="{ 'is-active': context.stage === section.key }"
        :title="section.description"
        @click="onStageChange(section.key)"
      >
        {{ section.name }}
        <small>{{ auxCounts[section.key] || 0 }}</small>
      </button>
    </div>

    <div class="evidence-library__filters" data-testid="library-filters">
      <label>
        <span>模型</span>
        <select
          data-testid="filter-model"
          :value="context.model || ''"
          @change="onModelChange"
        >
          <option value="">全部模型</option>
          <option
            v-for="model in modelOptions"
            :key="model.net"
            :value="model.net"
          >
            {{ model.label }}
          </option>
        </select>
      </label>

      <label>
        <span>类别对</span>
        <select
          data-testid="filter-pair"
          :value="selectedPairValue"
          @change="onPairChange"
        >
          <option value="">全部类别对</option>
          <option
            v-for="pair in pairs"
            :key="pair.label"
            :value="`${pair.classA}:${pair.classB}`"
          >
            {{ pair.label }}
          </option>
        </select>
      </label>

      <p class="evidence-library__count">
        已显示 {{ visibleItems.length }} / {{ filteredItems.length }} 张
        · 索引 {{ items.length }}
      </p>
    </div>

    <StatePanel
      v-if="galleryState"
      :state="galleryState"
      :title="
        galleryState === 'empty'
          ? emptyTitle
          : galleryState === 'error'
            ? '证据索引载入失败'
            : ''
      "
      :description="
        galleryState === 'empty'
          ? emptyDescription
          : galleryState === 'error'
            ? '请检查后端连接后重试。部分源失败时，已成功的源仍可继续浏览。'
            : ''
      "
      :action-label="galleryState === 'error' ? '重试' : '去任务中心'"
      @action="galleryState === 'error' ? refresh() : router.push('/tasks')"
      @retry="refresh"
    />

    <template v-else>
      <ArtifactGallery
        :items="visibleItems"
        :loading="loading"
        :url-for="urlFor"
        :format-class="formatClass"
        @open="openArtifact"
      />
      <div v-if="hasMore" class="evidence-library__more">
        <button
          type="button"
          data-testid="load-more"
          class="evidence-library__ghost"
          @click="loadMore"
        >
          加载更多（还有 {{ filteredItems.length - visibleItems.length }} 张）
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.evidence-library {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-6);
}

.evidence-library__hero {
  display: flex;
  justify-content: space-between;
  gap: var(--space-6);
  align-items: end;
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 12% 20%, rgba(11, 127, 117, 0.16), transparent 42%),
    linear-gradient(135deg, #f7faf6 0%, #eef4f1 48%, #f8f4ea 100%);
  border: 1px solid var(--color-line);
}

.evidence-library__eyebrow {
  margin: 0 0 var(--space-2);
  font-family: var(--font-display);
  letter-spacing: 0.12em;
  font-size: var(--text-xs);
  color: var(--color-accent-ink);
}

.evidence-library__hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw, 2.6rem);
  color: var(--color-ink);
}

.evidence-library__hero p {
  margin: var(--space-2) 0 0;
  max-width: 42rem;
  color: var(--color-ink-soft);
  line-height: 1.55;
}

.evidence-library__actions,
.evidence-library__more {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
}

.evidence-library__ghost,
.evidence-library__primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
}

.evidence-library__ghost {
  background: transparent;
  border-color: var(--color-line-strong);
  color: var(--color-ink);
}

.evidence-library__primary {
  background: var(--color-accent);
  color: #fff;
}

.evidence-library__lanes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.evidence-library__lanes button,
.evidence-library__aux button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.25rem;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line-strong);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  cursor: pointer;
}

.evidence-library__lanes button small,
.evidence-library__aux button small {
  color: var(--color-ink-muted);
}

.evidence-library__lanes button.is-active {
  border-color: var(--color-accent-border);
  background: var(--color-accent-soft);
  color: var(--color-accent-ink);
}

.evidence-library__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: end;
}

.evidence-library__aux {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.evidence-library__aux-label {
  font-size: var(--text-xs);
  color: var(--color-ink-muted);
  margin-right: var(--space-2);
}

.evidence-library__aux button.is-active {
  border-color: var(--color-amber-border);
  background: var(--color-amber-soft);
  color: var(--color-amber-ink);
}

.evidence-library__filters label {
  display: grid;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-ink-soft);
}

.evidence-library__filters select {
  min-width: 10rem;
  min-height: 2.4rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-ink);
  padding: 0 var(--space-3);
}

.evidence-library__count {
  margin: 0 0 0.35rem auto;
  color: var(--color-ink-muted);
  font-size: var(--text-sm);
}

@media (max-width: 840px) {
  .evidence-library {
    padding: var(--space-4);
  }

  .evidence-library__hero {
    flex-direction: column;
    align-items: start;
  }

  .evidence-library__count {
    margin-left: 0;
  }
}
</style>
