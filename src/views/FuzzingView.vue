<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>模糊测试 <span class="tag-stage">阶段 ③</span></h2>
        <p>因果引导模糊测试（DISF）。先看对比图，再决定是否重跑或导出。</p>
      </div>
      <div>
        <el-button
          @click="
            $router.push({
              name: 'evidence',
              query: {
                model: form.net,
                stage: 'fuzzing',
                classA: form.class_a,
                classB: form.class_b,
              },
            })
          "
        >查看模糊测试证据</el-button>
        <el-button @click="loadResults">刷新结果</el-button>
      </div>
    </div>

    <div class="panel" style="margin-bottom: 16px">
      <details>
        <summary style="cursor:pointer;font-weight:650;margin-bottom:12px">运行模糊测试（专家参数）</summary>
      <el-form :model="form" label-width="120px" style="max-width: 780px">
        <el-form-item label="模型">
          <el-select v-model="form.net" style="width: 240px" @change="loadResults">
            <el-option
              v-for="model in modelOptions"
              :key="model.net"
              :label="model.label"
              :value="model.net"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类别对">
          <el-input-number v-model="form.class_a" :min="0" />
          <span style="margin: 0 8px">→</span>
          <el-input-number v-model="form.class_b" :min="0" />
          <el-button link type="primary" style="margin-left: 12px" @click="pickFromSim">从相似对选择</el-button>
        </el-form-item>
        <el-form-item label="方法">
          <el-select v-model="form.method" style="width: 240px">
            <el-option v-for="m in methods" :key="m" :label="m" :value="m" />
          </el-select>
          <span class="form-hint">DISF 主方法：directed_diff</span>
        </el-form-item>
        <el-form-item label="max_iter">
          <el-input-number v-model="form.max_iter" :min="1" :max="5000" />
        </el-form-item>
        <el-form-item label="seed_size">
          <el-input-number v-model="form.seed_size" :min="1" :max="200" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="createFuzz">启动模糊测试</el-button>
          <el-button :loading="submitting" @click="createExport">导出错误对比图</el-button>
          <el-button @click="createUnsw">UNSW 全流程</el-button>
        </el-form-item>
      </el-form>
      </details>
    </div>

    <div class="panel" style="margin-bottom: 16px" v-if="pairDialog">
      <h3 style="margin:0 0 10px;font-size:16px">选择高相似类别对</h3>
      <el-table :data="pairs" height="280" @row-click="selectPair" highlight-current-row>
        <el-table-column label="A" min-width="150">
          <template #default="{ row }">{{ row.class_a }} · {{ row.name_a }}</template>
        </el-table-column>
        <el-table-column label="B" min-width="150">
          <template #default="{ row }">{{ row.class_b }} · {{ row.name_b }}</template>
        </el-table-column>
        <el-table-column prop="similarity" label="相似度" width="120" />
      </el-table>
    </div>

    <div class="panel" v-loading="loading">
      <div class="fuzz-head">
        <h3 style="margin:0;font-size:16px">已有模糊测试结果</h3>
        <p class="fuzz-head__meta">
          {{ results.length }} 组 · 有预览图 {{ withPreviewCount }} 组
        </p>
      </div>

      <div v-if="loading" class="empty">正在载入结果…</div>
      <div v-else-if="!results.length" class="empty">暂无结果。可先导出错误对比图，或运行模糊测试。</div>

      <div v-else class="img-grid fuzz-grid">
        <article v-for="row in results" :key="row.path" class="fuzz-card">
          <button
            type="button"
            class="fuzz-card__media"
            :disabled="!(row.preview || row.images?.[0])"
            @click="openFuzzImage(row.preview || row.images?.[0], row)"
          >
            <img
              v-if="row.preview || row.images?.[0]"
              :src="api.fileUrl(row.preview || row.images[0])"
              :alt="row.pair || row.name"
              loading="lazy"
            />
            <div v-else class="fuzz-card__empty">
              尚无对比图
              <small>可点「导出错误对比图」生成</small>
            </div>
          </button>
          <div class="fuzz-card__body">
            <div class="fuzz-card__title">
              <strong>{{ row.pair || row.name }}</strong>
              <span>{{ row.num_errors ?? '-' }} errors</span>
            </div>
            <div class="thumb-row" v-if="(row.images || []).length > 1">
              <button
                v-for="img in row.images.slice(0, 4)"
                :key="img"
                type="button"
                class="thumb-row__btn"
                @click="openFuzzImage(img, row)"
              >
                <img :src="api.fileUrl(img)" alt="" loading="lazy" />
              </button>
            </div>
            <div class="fuzz-card__actions">
              <el-button
                size="small"
                @click="
                  $router.push({
                    name: 'evidence',
                    query: {
                      model: form.net,
                      stage: 'fuzzing',
                      ...(parsePair(row.pair) || {}),
                    },
                  })
                "
              >进证据库</el-button>
              <a class="mono fuzz-card__path" :href="api.fileUrl(row.path)" target="_blank">
                {{ row.name }}
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { useRegisteredModels } from '@/composables/useRegisteredModels.js'
import { inferArtifactMeta } from '@/utils/artifacts.js'
import { mergeModelOptions } from '@/utils/models.js'
import { workspaceLocation } from '@/utils/workspace.js'

const route = useRoute()
const router = useRouter()
const { models: registeredModels } = useRegisteredModels()
const modelOptions = computed(() => mergeModelOptions(registeredModels.value))
const loading = ref(false)
const submitting = ref(false)
const results = ref([])
const pairs = ref([])
const pairDialog = ref(false)

const methods = [
  'directed_diff',
  'random',
  'adversarial',
  'targeted',
  'gradient',
  'genetic',
  'diff_point',
  'pure_diff',
]

const form = reactive({
  net: route.query.net || 'vgg16',
  class_a: Number(route.query.class_a ?? 23),
  class_b: Number(route.query.class_b ?? 28),
  method: 'directed_diff',
  max_iter: 20,
  seed_size: 20,
})

const withPreviewCount = computed(
  () => results.value.filter((row) => row.preview || row.images?.length).length,
)

function parsePair(pair) {
  if (!pair) return null
  const match = String(pair).match(/(\d+)[_-]vs[_-](\d+)/i)
  if (!match) return null
  return { classA: Number(match[1]), classB: Number(match[2]) }
}

function openFuzzImage(path, row) {
  if (!path) return
  const meta = inferArtifactMeta({ path, model: form.net })
  const pair = parsePair(row?.pair)
  router.push(
    workspaceLocation('case', {
      model: form.net,
      stage: meta.stage || 'fuzzing',
      classA: meta.classA ?? pair?.classA,
      classB: meta.classB ?? pair?.classB,
      artifact: path,
      panel: 'image',
    }),
  )
}

async function loadResults() {
  loading.value = true
  try {
    results.value = await api.fuzzingResults(form.net)
  } finally {
    loading.value = false
  }
}

async function pickFromSim() {
  const data = await api.similarity(form.net, 40, 0.5)
  pairs.value = data.top_pairs || []
  pairDialog.value = true
}

function selectPair(row) {
  form.class_a = row.class_a
  form.class_b = row.class_b
  pairDialog.value = false
  ElMessage.success(`已选择 ${row.class_a} → ${row.class_b}`)
}

async function createFuzz() {
  submitting.value = true
  try {
    const task = await api.createTask({
      name: `DISF Fuzz · ${form.net} · ${form.class_a}vs${form.class_b} · ${form.method}`,
      task_type: 'causal_fuzz',
      params: {
        net: form.net,
        model: form.net,
        class_a: form.class_a,
        class_b: form.class_b,
        method: form.method,
        max_iter: form.max_iter,
        seed_size: form.seed_size,
      },
    })
    ElMessage.success('模糊测试已排队')
    router.push(`/tasks/${task.task_id}`)
  } finally {
    submitting.value = false
  }
}

async function createExport() {
  submitting.value = true
  try {
    const task = await api.createTask({
      name: `Export Fuzz Images · ${form.net}`,
      task_type: 'export_fuzz_images',
      params: { net: form.net, model: form.net },
    })
    ElMessage.success('导出任务已排队')
    router.push(`/tasks/${task.task_id}`)
  } finally {
    submitting.value = false
  }
}

async function createUnsw() {
  submitting.value = true
  try {
    const task = await api.createTask({
      name: 'UNSW DISF Pipeline',
      task_type: 'unsw_pipeline',
      params: { script: 'unsw_disf_pipeline.py' },
    })
    ElMessage.success('UNSW 流程已排队')
    router.push(`/tasks/${task.task_id}`)
  } finally {
    submitting.value = false
  }
}

onMounted(loadResults)
</script>

<style scoped>
.form-hint { margin-left: 10px; color: var(--muted); font-size: 12px; }
.empty { color: var(--muted); font-size: 13px; }
.fuzz-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 12px;
}
.fuzz-head__meta {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}
.fuzz-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}
.fuzz-card__media {
  display: block;
  width: 100%;
  padding: 0;
  color: inherit;
  text-align: inherit;
  background: var(--color-canvas, #edf2ef);
  border: 0;
  cursor: pointer;
}
.fuzz-card__media:disabled {
  cursor: default;
}
.thumb-row__btn {
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.fuzz-card__media img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  background: #fff;
  border: 0;
  border-radius: 0;
  padding: 0;
}
.fuzz-card__empty {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  aspect-ratio: 16 / 9;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
.fuzz-card__empty small {
  font-size: 11px;
}
.fuzz-card__body {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.fuzz-card__title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}
.fuzz-card__title span {
  color: var(--muted);
  font-size: 12px;
}
.thumb-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.thumb-row img {
  width: 64px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--line);
}
.fuzz-card__actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.fuzz-card__path {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
