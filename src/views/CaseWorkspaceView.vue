<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { api } from '@/api'
import EvidenceContextBar from '@/components/evidence/EvidenceContextBar.vue'
import ImageCompare from '@/components/evidence/ImageCompare.vue'
import RelatedEvidence from '@/components/evidence/RelatedEvidence.vue'
import StatePanel from '@/components/common/StatePanel.vue'
import SimilarityMatrix from '@/components/charts/SimilarityMatrix.vue'
import SimilarityPairs from '@/components/charts/SimilarityPairs.vue'
import CausalChannels from '@/components/charts/CausalChannels.vue'
import {
  RESEARCH_PANELS,
  RESEARCH_STAGE_KEYS,
  RESEARCH_STAGES,
} from '@/constants/research.js'
import { useArtifactIndex } from '@/composables/useArtifactIndex.js'
import { useCaseCharts } from '@/composables/useCaseCharts.js'
import { useClassLabels } from '@/composables/useClassLabels.js'
import { useResearchContext } from '@/composables/useResearchContext.js'
import {
  adjacentStages,
  findArtifact,
  findStagePeer,
  listRelatedArtifacts,
  workspaceLocation,
} from '@/utils/workspace.js'

const router = useRouter()
const { context, updateContext } = useResearchContext()
const { formatClass } = useClassLabels()

const { items, loading, error, isDemo, refresh } = useArtifactIndex({
  net: () => context.value.model || 'vgg16',
  relDirs: 'case',
  includeImageRoot: true,
  includeFuzzingApi: false,
  limit: 900,
  immediate: true,
})

const {
  matrix,
  pair: chartPair,
  loading: chartsLoading,
  error: chartsError,
} = useCaseCharts({
  context,
  immediate: true,
})

watch(
  () => context.value.model,
  () => {
    void refresh()
  },
)

const imageFailed = ref(false)
const imageRenderKey = ref(0)

const currentItem = computed(() =>
  findArtifact(items.value, context.value.artifact),
)
const relatedItems = computed(() =>
  listRelatedArtifacts(items.value, currentItem.value),
)
const neighbors = computed(() =>
  adjacentStages(currentItem.value?.stage || context.value.stage),
)
const activePanel = computed(() => context.value.panel || 'image')
const compareCandidate = computed(() =>
  relatedItems.value.find(
    (item) =>
      item.isImage &&
      item.path !== currentItem.value?.path &&
      (item.kind === 'comparison' ||
        item.kind === 'heatmap' ||
        item.kind === 'mask'),
  ),
)

const pageState = computed(() => {
  if (loading.value && !currentItem.value) return 'loading'
  if (!context.value.artifact) return 'empty'
  if (error.value?.length && !currentItem.value) return 'error'
  if (!currentItem.value) return 'empty'
  return null
})

const urlFor = (item) =>
  api.fileUrl(item.previewPath || item.path || item.name || '')

watch(
  () => currentItem.value?.path,
  () => {
    imageFailed.value = false
    imageRenderKey.value += 1
  },
)

watch(
  currentItem,
  (item) => {
    if (!item?.stage || !RESEARCH_STAGE_KEYS.includes(item.stage)) return
    if (item.stage === context.value.stage) return
    updateContext(
      {
        stage: item.stage,
        model: item.model || context.value.model,
        classA: Number.isFinite(item.classA)
          ? item.classA
          : context.value.classA,
        classB: Number.isFinite(item.classB)
          ? item.classB
          : context.value.classB,
      },
      { replace: true },
    )
  },
  { immediate: true },
)

const setPanel = (panel) => {
  updateContext({ panel }, { replace: true })
}

const openArtifact = (item, { panel = 'image' } = {}) => {
  if (!item) return
  router.push(
    workspaceLocation('case', {
      model: item.model || context.value.model,
      stage: item.stage || context.value.stage,
      classA:
        item.classA ??
        (Number.isFinite(context.value.classA) ? context.value.classA : null),
      classB:
        item.classB ??
        (Number.isFinite(context.value.classB) ? context.value.classB : null),
      artifact: item.path || item.id,
      panel,
    }),
  )
}

const goToStage = (stageKey) => {
  if (!stageKey || stageKey === (currentItem.value?.stage || context.value.stage)) {
    return
  }
  const peer = findStagePeer(items.value, {
    stage: stageKey,
    model: context.value.model || currentItem.value?.model,
    classA: context.value.classA ?? currentItem.value?.classA,
    classB: context.value.classB ?? currentItem.value?.classB,
    from: currentItem.value,
  })
  if (peer) {
    openArtifact(peer)
    return
  }
  router.push({
    name: 'evidence',
    query: {
      ...(context.value.model || currentItem.value?.model
        ? { model: context.value.model || currentItem.value?.model }
        : {}),
      stage: stageKey,
      ...(Number.isFinite(context.value.classA ?? currentItem.value?.classA)
        ? { classA: context.value.classA ?? currentItem.value?.classA }
        : {}),
      ...(Number.isFinite(context.value.classB ?? currentItem.value?.classB)
        ? { classB: context.value.classB ?? currentItem.value?.classB }
        : {}),
      missingPeer: '1',
    },
  })
}

const onStageChange = (stage) => {
  goToStage(stage)
}

const onClearPair = () => {
  updateContext({ classA: null, classB: null }, { replace: true })
}

const goAdjacentStage = (stage) => {
  if (!stage) return
  goToStage(stage.key)
}

const backToLibrary = () => {
  router.push(
    workspaceLocation('evidence', {
      model: context.value.model,
      stage: currentItem.value?.stage || context.value.stage,
      classA: context.value.classA,
      classB: context.value.classB,
    }),
  )
}

const retryImage = () => {
  imageFailed.value = false
  imageRenderKey.value += 1
}
</script>

<template>
  <div class="case-workspace" data-testid="case-workspace">
    <header class="case-workspace__top">
      <button
        type="button"
        class="case-workspace__back"
        data-testid="back-library"
        @click="backToLibrary"
      >
        ← 返回证据库
      </button>
      <div class="case-workspace__stage-nav">
        <button
          type="button"
          :disabled="!neighbors.previous"
          data-testid="prev-stage"
          @click="goAdjacentStage(neighbors.previous)"
        >
          上一阶段
          <span v-if="neighbors.previous">{{ neighbors.previous.name }}</span>
        </button>
        <button
          type="button"
          :disabled="!neighbors.next"
          data-testid="next-stage"
          @click="goAdjacentStage(neighbors.next)"
        >
          下一阶段
          <span v-if="neighbors.next">{{ neighbors.next.name }}</span>
        </button>
      </div>
    </header>

    <EvidenceContextBar
      :context="{
        ...context,
        stage: currentItem?.stage || context.stage,
        layer: currentItem?.layer,
      }"
      :is-demo="isDemo"
      :stages="RESEARCH_STAGES"
      :format-class="formatClass"
      @stage-change="onStageChange"
      @clear-pair="onClearPair"
    />

    <StatePanel
      v-if="pageState"
      :state="pageState"
      :title="
        pageState === 'empty'
          ? '尚未选定案例证据'
          : pageState === 'error'
            ? '案例证据载入失败'
            : ''
      "
      :description="
        pageState === 'empty'
          ? '从证据库选择一张图片，即可在此连续查看结论、图表与参数。'
          : '请检查后端连接或确认产物路径仍然有效。'
      "
      action-label="打开证据库"
      @action="backToLibrary"
      @retry="refresh"
    />

    <template v-else>
      <nav class="case-workspace__panels" aria-label="案例面板">
        <button
          v-for="panel in RESEARCH_PANELS"
          :key="panel.key"
          type="button"
          :data-panel="panel.key"
          :aria-current="activePanel === panel.key ? 'page' : undefined"
          :class="{ 'is-active': activePanel === panel.key }"
          @click="setPanel(panel.key)"
        >
          <small>{{ panel.key.toUpperCase() }}</small>
          <span>{{ panel.name }}</span>
        </button>
      </nav>

      <div class="case-workspace__body">
        <section class="case-workspace__main" data-testid="case-panel">
          <article v-if="activePanel === 'image'" class="case-panel case-panel--image">
            <header>
              <p>IMAGE</p>
              <h2>{{ currentItem.title }}</h2>
            </header>
            <div class="case-panel__canvas">
              <img
                v-if="currentItem.isImage && !imageFailed"
                :key="imageRenderKey"
                data-testid="case-image"
                :src="urlFor(currentItem)"
                :alt="currentItem.title || currentItem.name || '案例证据'"
                @error="imageFailed = true"
              />
              <StatePanel
                v-else-if="currentItem.isImage && imageFailed"
                state="error"
                title="图片加载失败"
                description="请确认文件仍可访问后重试。"
                action-label="重试"
                @retry="retryImage"
                @action="retryImage"
              />
              <div v-else class="case-panel__file">
                <p>当前产物不是图片预览类型。</p>
                <a :href="urlFor(currentItem)" target="_blank" rel="noreferrer">
                  打开文件
                </a>
              </div>
            </div>
          </article>

          <article v-else-if="activePanel === 'insight'" class="case-panel">
            <header>
              <p>INSIGHT</p>
              <h2>{{ currentItem.title }}</h2>
            </header>
            <p>{{ currentItem.description }}</p>
            <dl>
              <div v-if="currentItem.model">
                <dt>模型</dt>
                <dd>{{ currentItem.model }}</dd>
              </div>
              <div v-if="currentItem.stage">
                <dt>阶段</dt>
                <dd>{{ currentItem.stage }}</dd>
              </div>
              <div
                v-if="
                  Number.isFinite(currentItem.classA) ||
                  Number.isFinite(currentItem.classB)
                "
              >
                <dt>类别对</dt>
                <dd>
                  {{ currentItem.classA ?? '—' }}
                  ↔
                  {{ currentItem.classB ?? '—' }}
                </dd>
              </div>
              <div v-if="currentItem.layer">
                <dt>网络层</dt>
                <dd>{{ currentItem.layer }}</dd>
              </div>
            </dl>
          </article>

          <article v-else-if="activePanel === 'chart'" class="case-panel">
            <header>
              <p>CHART</p>
              <h2>辅助图表</h2>
            </header>
            <p class="case-panel__lead">
              图表从属于当前案例，用于解释相似度与通道效应，不替代图片证据。
            </p>
            <p
              v-if="
                !Number.isFinite(context.classA) ||
                !Number.isFinite(context.classB)
              "
              class="case-panel__lead"
              data-testid="chart-pair-hint"
            >
              当前没有选定类别对。相似度矩阵仍可预览；通道效应需要带类别对的证据（例如热力图
              <code>119_vs_332</code>），或先在证据库筛选类别对后再进入案例。
            </p>
            <div class="case-panel__charts">
              <SimilarityMatrix
                :matrix="matrix"
                :loading="chartsLoading"
                :error="chartsError || ''"
              />
              <SimilarityPairs
                :matrix="matrix"
                :loading="chartsLoading"
                :error="chartsError || ''"
              />
              <CausalChannels
                :pair="chartPair"
                :class-a="context.classA"
                :class-b="context.classB"
                :loading="chartsLoading"
                :error="chartsError || ''"
              />
              <ImageCompare
                v-if="currentItem?.isImage && compareCandidate"
                :left="currentItem"
                :right="compareCandidate"
                :url-for="urlFor"
              />
            </div>
          </article>

          <article v-else class="case-panel">
            <header>
              <p>PARAMS</p>
              <h2>参数与来源</h2>
            </header>
            <dl>
              <div>
                <dt>路径</dt>
                <dd class="mono">{{ currentItem.path }}</dd>
              </div>
              <div v-if="currentItem.kind">
                <dt>类型</dt>
                <dd>{{ currentItem.kind }}</dd>
              </div>
              <div v-if="currentItem.source">
                <dt>来源</dt>
                <dd>{{ currentItem.source }}</dd>
              </div>
              <div v-if="currentItem.size">
                <dt>大小</dt>
                <dd>{{ currentItem.size }}</dd>
              </div>
              <div v-if="currentItem.mtime">
                <dt>修改时间</dt>
                <dd>{{ currentItem.mtime }}</dd>
              </div>
            </dl>
            <details>
              <summary>原始元数据</summary>
              <pre>{{ currentItem }}</pre>
            </details>
          </article>
        </section>

        <aside class="case-workspace__side">
          <RelatedEvidence
            :items="relatedItems"
            :url-for="urlFor"
            :format-class="formatClass"
            @open="openArtifact"
          />
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.case-workspace {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-6);
}

.case-workspace__top {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.case-workspace__back,
.case-workspace__stage-nav button,
.case-workspace__panels button {
  border: 1px solid var(--color-line-strong);
  background: var(--color-surface);
  color: var(--color-ink);
  border-radius: var(--radius-md);
  min-height: 2.4rem;
  padding: 0 var(--space-3);
  cursor: pointer;
}

.case-workspace__stage-nav {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.case-workspace__stage-nav button span {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-ink-muted);
}

.case-workspace__stage-nav button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.case-workspace__panels {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.case-workspace__panels button {
  display: grid;
  gap: 0.15rem;
  text-align: left;
  padding: var(--space-3);
  transition:
    background var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard);
}

.case-workspace__panels button small {
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  color: var(--color-ink-muted);
}

.case-workspace__panels button.is-active {
  border-color: var(--color-accent-border);
  background: var(--color-accent-soft);
  color: var(--color-accent-ink);
}

.case-workspace__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: var(--space-5);
  align-items: start;
}

.case-panel {
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
}

.case-panel--image {
  background:
    radial-gradient(circle at top right, rgba(11, 127, 117, 0.08), transparent 40%),
    var(--color-surface);
}

.case-panel header p {
  margin: 0;
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
  color: var(--color-accent-ink);
}

.case-panel h2 {
  margin: var(--space-2) 0 var(--space-4);
  font-family: var(--font-display);
}

.case-panel__lead {
  margin: 0 0 var(--space-4);
  color: var(--color-ink-soft);
  line-height: 1.55;
}

.case-panel__charts {
  display: grid;
  gap: var(--space-5);
}

.case-panel__canvas {
  display: grid;
  place-items: center;
  min-height: 24rem;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, #101f24, #173038);
  box-shadow: var(--shadow-canvas);
}

.case-panel__canvas img {
  max-width: 100%;
  max-height: min(70vh, 40rem);
  object-fit: contain;
}

.case-panel__file {
  color: #d7e4df;
  text-align: center;
}

.case-panel__file a {
  color: #9ed7cf;
}

.case-panel dl {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-4) 0 0;
}

.case-panel dt {
  font-size: var(--text-xs);
  color: var(--color-ink-muted);
}

.case-panel dd {
  margin: var(--space-1) 0 0;
}

.case-panel .mono,
.case-panel pre {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  word-break: break-all;
}

.case-panel details {
  margin-top: var(--space-4);
}

.case-panel pre {
  max-height: 20rem;
  overflow: auto;
  padding: var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
}

@media (max-width: 960px) {
  .case-workspace {
    padding: var(--space-4);
  }

  .case-workspace__panels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .case-workspace__body {
    grid-template-columns: 1fr;
  }
}
</style>
