<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>因果图谱 <span class="tag-stage">阶段 ②</span></h2>
        <p>调用 run_full_pipeline.py：高相似对 → 层筛选 → 单通道因果 → 根本差异图谱。可先浏览已有结果。</p>
      </div>
      <div>
        <el-button
          @click="
            $router.push({
              name: 'evidence',
              query: { model: form.net, stage: 'causal' },
            })
          "
        >查看因果证据</el-button>
        <el-button type="primary" :loading="loading" @click="load">刷新结果</el-button>
      </div>
    </div>

    <div class="panel" style="margin-bottom: 16px">
      <details>
        <summary style="cursor:pointer;font-weight:650;margin-bottom:12px">运行因果流水线（专家参数）</summary>
      <el-form :model="form" label-width="130px" style="max-width: 760px">
        <el-form-item label="模型">
          <el-select v-model="form.net" style="width: 240px" @change="load">
            <el-option
              v-for="model in modelOptions"
              :key="model.net"
              :label="model.label"
              :value="model.net"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Top-K 相似对">
          <el-input-number v-model="form.top_k" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="最小相似度">
          <el-input-number v-model="form.min_similarity" :min="0" :max="1" :step="0.05" />
        </el-form-item>
        <el-form-item label="层筛选样本数">
          <el-input-number v-model="form.num_images" :min="1" :max="200" />
        </el-form-item>
        <el-form-item label="单通道样本数">
          <el-input-number v-model="form.single_num_images" :min="1" :max="200" />
        </el-form-item>
        <el-form-item label="缓存策略">
          <el-checkbox v-model="form.skip_screening">跳过层筛选 (skip_screening)</el-checkbox>
          <el-checkbox v-model="form.skip_single" style="margin-left: 16px">跳过单通道 (skip_single)</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="createPipeline">启动因果流水线</el-button>
        </el-form-item>
      </el-form>
      </details>
    </div>

    <div class="grid-3" style="margin-bottom: 16px">
      <div class="stat-card">
        <div class="label">差异图谱</div>
        <div class="value" style="font-size:18px;padding-top:8px">{{ info.exists ? '已存在' : '未生成' }}</div>
        <div class="hint">差异图谱路径由后端提供</div>
      </div>
      <div class="stat-card">
        <div class="label">图谱条目</div>
        <div class="value">{{ info.num_entries ?? '-' }}</div>
        <div class="hint">diff_map.pkl</div>
      </div>
      <div class="stat-card">
        <div class="label">热力图</div>
        <div class="value">{{ (info.heatmaps || []).length }}</div>
        <div class="hint">results/.../heatmaps</div>
      </div>
    </div>

    <div class="panel" style="margin-bottom: 16px" v-if="info.report_preview">
      <h3 style="margin:0 0 10px;font-size:16px">差异图谱报告预览</h3>
      <div class="log-box">{{ info.report_preview }}</div>
    </div>

    <div class="panel">
      <div class="page-header" style="margin-bottom: 12px">
        <h3 style="margin:0;font-size:16px">热力图预览</h3>
        <el-button
          @click="
            $router.push({
              name: 'evidence',
              query: { model: form.net, stage: 'causal' },
            })
          "
        >在证据库查看全部</el-button>
      </div>
      <div v-if="!(info.heatmaps || []).length" class="empty">暂无图片产物</div>
      <div class="img-grid" v-else>
        <button
          v-for="p in previewHeatmaps"
          :key="p"
          type="button"
          class="img-item img-item--button"
          @click="openHeatmap(p)"
        >
          <img v-if="isImage(p)" :src="api.fileUrl(p)" :alt="p" loading="lazy" />
          <div v-else class="file-chip mono">{{ p }}</div>
          <div class="cap mono">{{ p.split('/').pop() }}</div>
        </button>
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
const info = ref({ heatmaps: [] })

const form = reactive({
  net: route.query.net || 'vgg16',
  top_k: 20,
  min_similarity: 0.75,
  num_images: 30,
  single_num_images: 50,
  max_channels: 10,
  skip_screening: false,
  skip_single: false,
})

function isImage(p) {
  return /\.(png|jpg|jpeg)$/i.test(p)
}

const previewHeatmaps = computed(() => (info.value.heatmaps || []).slice(0, 6))

function openHeatmap(path) {
  const meta = inferArtifactMeta({ path, model: form.net })
  router.push(
    workspaceLocation('case', {
      model: form.net,
      stage: meta.stage || 'causal',
      classA: meta.classA,
      classB: meta.classB,
      artifact: path,
      panel: 'image',
    }),
  )
}

async function load() {
  loading.value = true
  try {
    info.value = await api.diffMap(form.net)
  } finally {
    loading.value = false
  }
}

async function createPipeline() {
  submitting.value = true
  try {
    const task = await api.createTask({
      name: `Causal Pipeline · ${form.net}`,
      task_type: 'causal_pipeline',
      params: { ...form, model: form.net },
    })
    ElMessage.success('因果流水线已排队')
    router.push(`/tasks/${task.task_id}`)
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.empty { color: var(--muted); font-size: 13px; }
.img-item .cap { margin-top: 6px; color: var(--muted); font-size: 11px; word-break: break-all; }
.img-item--button {
  width: 100%;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.file-chip {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}
</style>
