<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>任务中心</h2>
        <p>所有对 NAD 脚本的调度任务。可查看进度、日志、停止与删除。</p>
      </div>
      <div>
        <el-button @click="$router.push({ name: 'evidence' })">证据库</el-button>
        <el-select v-model="filterType" clearable placeholder="任务类型" style="width: 180px; margin: 0 8px" @change="load">
          <el-option v-for="t in types" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
        <el-button @click="load">刷新</el-button>
        <el-button type="danger" plain :disabled="!selected.length" @click="removeSelected">删除选中</el-button>
      </div>
    </div>

    <div class="panel">
      <el-table
        :data="tasks"
        v-loading="loading"
        stripe
        @selection-change="(rows) => (selected = rows.map((r) => r.task_id))"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="name" label="任务名" min-width="220" />
        <el-table-column prop="task_type" label="类型" width="150" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="160">
          <template #default="{ row }">
            <el-progress :percentage="Math.round(row.progress || 0)" :status="progressStatus(row.status)" />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ fmtTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/tasks/${row.task_id}`)">详情</el-button>
            <el-button
              v-if="isSuccessfulTask(row)"
              link
              type="success"
              @click="$router.push(evidenceLocationFromTask(row))"
            >证据</el-button>
            <el-button
              link
              type="warning"
              :disabled="row.status !== 'running' && row.status !== 'queued'"
              @click="stop(row.task_id)"
            >停止</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import {
  TASK_TYPE_META,
  evidenceLocationFromTask,
  isSuccessfulTask,
} from '@/utils/taskFlow.js'

const loading = ref(false)
const tasks = ref([])
const selected = ref([])
const filterType = ref()
let timer

const types = Object.entries(TASK_TYPE_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

function statusType(s) {
  return ({ queued: 'info', running: 'warning', succeeded: 'success', failed: 'danger', stopped: 'info' })[s] || 'info'
}
function progressStatus(s) {
  if (s === 'succeeded') return 'success'
  if (s === 'failed') return 'exception'
  return undefined
}
function fmtTime(ts) {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString()
}

async function load() {
  loading.value = true
  try {
    tasks.value = await api.tasks(filterType.value || undefined)
  } finally {
    loading.value = false
  }
}

async function stop(id) {
  await api.stopTask(id)
  ElMessage.success('已发送停止信号')
  load()
}

async function removeSelected() {
  await ElMessageBox.confirm(`确认删除 ${selected.value.length} 个任务记录？`, '提示')
  await api.deleteTasks(selected.value)
  ElMessage.success('已删除')
  load()
}

onMounted(() => {
  load()
  timer = setInterval(load, 4000)
})
onUnmounted(() => clearInterval(timer))
</script>
