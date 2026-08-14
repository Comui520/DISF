<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>模型中心</h2>
        <p>展示 DISF 支持的模型与 NAD 仓库中的已有产物状态（checkpoint / 相似度 / 差异图谱 / 模糊测试结果）。</p>
      </div>
      <div>
        <el-button @click="$router.push('/evidence')">打开证据库</el-button>
        <el-button type="primary" :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom: 16px">
      <div class="stat-card">
        <div class="label">已注册模型</div>
        <div class="value">{{ models.length }}</div>
        <div class="hint">来自后端模型列表</div>
      </div>
      <div class="stat-card">
        <div class="label">Places 类别标签</div>
        <div class="value">{{ labels.length }}</div>
        <div class="hint">类别标签由后端提供</div>
      </div>
      <div class="stat-card">
        <div class="label">系统状态</div>
        <div class="value" style="font-size:18px;padding-top:8px">{{ health?.nad_exists ? 'NAD 已连接' : '未连接' }}</div>
        <div class="hint">后端健康检查</div>
      </div>
    </div>

    <div class="panel">
      <el-table :data="models" v-loading="loading" stripe>
        <el-table-column prop="name" label="模型" width="140" />
        <el-table-column prop="net" label="网络" width="120" />
        <el-table-column prop="dataset" label="数据集" width="100" />
        <el-table-column prop="num_classes" label="类别数" width="90" />
        <el-table-column label="描述" min-width="220">
          <template #default="{ row }">{{ row.description }}</template>
        </el-table-column>
        <el-table-column label="产物状态" min-width="280">
          <template #default="{ row }">
            <template v-if="row.dataset === 'place'">
              <el-tag size="small" :type="row.checkpoints?.count ? 'success' : 'info'">
                mask {{ row.checkpoints?.count || 0 }}
              </el-tag>
              <el-tag size="small" class="ml" :type="row.similarity?.exists ? 'success' : 'info'">相似度</el-tag>
              <el-tag size="small" class="ml" :type="row.diff_map?.exists ? 'success' : 'info'">差异图谱</el-tag>
              <el-tag size="small" class="ml" type="warning">fuzz {{ row.fuzzing_count || 0 }}</el-tag>
            </template>
            <template v-else>
              <el-tag size="small" :type="row.model_file_exists ? 'success' : 'danger'">h5</el-tag>
              <el-tag size="small" class="ml" :type="row.unsw?.exists ? 'success' : 'info'">UNSW 结果</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="
                $router.push({
                  name: 'evidence',
                  query: { model: row.net, stage: 'subarch' },
                })
              "
            >证据</el-button>
            <el-button
              link
              type="primary"
              @click="$router.push({ path: '/subarch', query: { net: row.net } })"
            >子架构</el-button>
            <el-button
              link
              type="primary"
              @click="$router.push({ path: '/causal', query: { net: row.net } })"
            >因果</el-button>
            <el-button
              link
              type="primary"
              @click="$router.push({ path: '/fuzzing', query: { net: row.net } })"
            >测试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { api } from '@/api'

const loading = ref(false)
const models = ref([])
const labels = ref([])
const health = ref(null)

async function load() {
  loading.value = true
  try {
    const [m, l, h] = await Promise.all([api.models(), api.labels(), api.health()])
    models.value = m || []
    labels.value = l || []
    health.value = h
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.ml { margin-left: 6px; }
</style>
