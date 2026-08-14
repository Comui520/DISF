<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>子架构分析 <span class="tag-stage">阶段 ①</span></h2>
        <p>调用 NAD 的 findpath / similarSubArch，获取功能子架构与类别相似度。默认只调度脚本，不修改 NAD 源码。</p>
      </div>
      <el-button
        @click="
          $router.push({
            name: 'evidence',
            query: { model: form.net, stage: 'subarch' },
          })
        "
      >查看子架构证据</el-button>
    </div>

    <div class="panel" style="margin-bottom: 16px">
      <details>
        <summary style="cursor:pointer;font-weight:650;margin-bottom:12px">运行任务（专家参数）</summary>
      <el-form :model="form" label-width="110px" style="max-width: 720px">
        <el-form-item label="模型">
          <el-select v-model="form.net" style="width: 240px">
            <el-option
              v-for="model in modelOptions"
              :key="model.net"
              :label="model.label"
              :value="model.net"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数据集">
          <el-select v-model="form.dataset" style="width: 240px">
            <el-option label="place" value="place" />
          </el-select>
        </el-form-item>
        <el-divider content-position="left">NAD Mask 训练 (findpath.py)</el-divider>
        <el-form-item label="beta">
          <el-input-number v-model="form.beta" :step="0.01" :min="0" />
          <span class="form-hint">vgg16 论文默认 5.0；resnet50 默认 0.02</span>
        </el-form-item>
        <el-form-item label="epoch">
          <el-input-number v-model="form.epoch" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="类别范围">
          <el-input-number v-model="form.start_class" :min="0" placeholder="start" />
          <span style="margin: 0 8px">~</span>
          <el-input-number v-model="form.end_class" :min="0" placeholder="end" />
          <span class="form-hint">可选；留空表示脚本默认行为</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="createMaskTask">启动 Mask 训练</el-button>
        </el-form-item>

        <el-divider content-position="left">相似度矩阵 (similarSubArch.py)</el-divider>
        <el-form-item label="mask epoch">
          <el-input-number v-model="form.sim_epoch" :min="0" :max="21" />
        </el-form-item>
        <el-form-item label="示例类别">
          <el-input-number v-model="form.class_id" :min="0" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="createSimTask">计算相似度</el-button>
          <el-button @click="loadPairs">刷新 Top 相似对</el-button>
        </el-form-item>
      </el-form>
      </details>
    </div>

    <div class="grid-3" style="margin-bottom: 16px">
      <div class="stat-card">
        <div class="label">已完成 Mask 类别</div>
        <div class="value">{{ ckpt.count || 0 }}</div>
        <div class="hint">checkpoint 状态由后端提供</div>
      </div>
      <div class="stat-card">
        <div class="label">相似度矩阵</div>
        <div class="value" style="font-size:18px;padding-top:8px">{{ sim.matrix?.exists ? '已存在' : '未生成' }}</div>
        <div class="hint" v-if="sim.matrix?.shape">shape {{ sim.matrix.shape.join('×') }} · mean {{ fmt(sim.matrix.mean) }}</div>
      </div>
      <div class="stat-card">
        <div class="label">Top 相似对</div>
        <div class="value">{{ pairs.length }}</div>
        <div class="hint">min_sim={{ minSim }}</div>
      </div>
    </div>

    <div class="panel">
      <div class="page-header" style="margin-bottom: 8px">
        <h3 style="margin:0;font-size:16px">高相似类别对</h3>
        <div>
          <el-input-number v-model="topK" :min="5" :max="100" size="small" />
          <el-input-number v-model="minSim" :min="0" :max="1" :step="0.05" size="small" style="margin-left:8px" />
        </div>
      </div>
      <el-table :data="pairs" v-loading="loading" height="420" stripe>
        <el-table-column type="index" width="60" />
        <el-table-column label="类别 A" min-width="160">
          <template #default="{ row }">{{ row.class_a }} · {{ row.name_a }}</template>
        </el-table-column>
        <el-table-column label="类别 B" min-width="160">
          <template #default="{ row }">{{ row.class_b }} · {{ row.name_b }}</template>
        </el-table-column>
        <el-table-column prop="similarity" label="Jaccard 相似度" width="140" />
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="goEvidence(row)">查看证据</el-button>
            <el-button link type="primary" @click="goFuzz(row)">对该对做模糊测试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { useRegisteredModels } from '@/composables/useRegisteredModels.js'
import { mergeModelOptions } from '@/utils/models.js'

const route = useRoute()
const router = useRouter()
const { models: registeredModels } = useRegisteredModels()
const modelOptions = computed(() => mergeModelOptions(registeredModels.value))
const loading = ref(false)
const submitting = ref(false)
const ckpt = ref({})
const sim = ref({ matrix: {}, top_pairs: [] })
const pairs = ref([])
const topK = ref(30)
const minSim = ref(0.5)

const form = reactive({
  net: route.query.net || 'vgg16',
  dataset: 'place',
  beta: 5.0,
  epoch: 21,
  start_class: undefined,
  end_class: undefined,
  sim_epoch: 20,
  class_id: 0,
})

form.beta = form.net === 'vgg16' ? 5.0 : 0.02

function fmt(v) {
  return typeof v === 'number' ? v.toFixed(4) : '-'
}

async function loadStatus() {
  loading.value = true
  try {
    ckpt.value = await api.checkpoints(form.net)
    await loadPairs()
  } finally {
    loading.value = false
  }
}

async function loadPairs() {
  const data = await api.similarity(form.net, topK.value, minSim.value)
  sim.value = data
  pairs.value = data.top_pairs || []
}

async function createMaskTask() {
  submitting.value = true
  try {
    const params = {
      net: form.net,
      model: form.net,
      dataset: form.dataset,
      beta: form.beta,
      epoch: form.epoch,
    }
    if (form.start_class !== undefined && form.start_class !== null) params.start_class = form.start_class
    if (form.end_class !== undefined && form.end_class !== null) params.end_class = form.end_class
    const task = await api.createTask({
      name: `NAD Mask · ${form.net}`,
      task_type: 'nad_mask',
      params,
    })
    ElMessage.success('任务已创建')
    router.push(`/tasks/${task.task_id}`)
  } finally {
    submitting.value = false
  }
}

async function createSimTask() {
  submitting.value = true
  try {
    const task = await api.createTask({
      name: `SubArch Sim · ${form.net}`,
      task_type: 'subarch_sim',
      params: {
        net: form.net,
        model: form.net,
        dataset: form.dataset,
        epoch: form.sim_epoch,
        class_id: form.class_id,
      },
    })
    ElMessage.success('任务已创建')
    router.push(`/tasks/${task.task_id}`)
  } finally {
    submitting.value = false
  }
}

function goEvidence(row) {
  router.push({
    name: 'evidence',
    query: {
      model: form.net,
      stage: 'subarch',
      classA: row.class_a,
      classB: row.class_b,
    },
  })
}

function goFuzz(row) {
  router.push({
    path: '/fuzzing',
    query: { net: form.net, class_a: row.class_a, class_b: row.class_b },
  })
}

watch(() => form.net, () => {
  form.beta = form.net === 'vgg16' ? 5.0 : 0.02
  loadStatus()
})

watch([topK, minSim], () => loadPairs())

onMounted(loadStatus)
</script>

<style scoped>
.form-hint { margin-left: 10px; color: var(--muted); font-size: 12px; }
h3 { font-weight: 650; }
</style>
