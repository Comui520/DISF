<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>任务详情</h2>
        <p class="mono">{{ taskId }}</p>
      </div>
      <div>
        <el-button @click="$router.push('/tasks')">返回列表</el-button>
        <el-button
          v-if="evidenceLink"
          type="success"
          data-testid="open-evidence"
          @click="$router.push(evidenceLink)"
        >查看证据</el-button>
        <el-button
          type="warning"
          :disabled="!task || (task.status !== 'running' && task.status !== 'queued')"
          @click="stop"
        >停止</el-button>
        <el-button type="primary" @click="refresh">刷新</el-button>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom: 16px" v-if="task">
      <div class="stat-card">
        <div class="label">状态</div>
        <div class="value" style="font-size:20px;padding-top:8px">{{ task.status }}</div>
        <div class="hint">{{ task.message }}</div>
      </div>
      <div class="stat-card">
        <div class="label">进度</div>
        <div class="value">{{ Math.round(task.progress || 0) }}%</div>
        <div class="hint">{{ task.task_type }}</div>
      </div>
      <div class="stat-card">
        <div class="label">PID / 返回码</div>
        <div class="value" style="font-size:20px;padding-top:8px">{{ task.pid ?? '-' }} / {{ task.return_code ?? '-' }}</div>
        <div class="hint mono">{{ task.name }}</div>
      </div>
    </div>

    <div class="panel evidence-cta" v-if="evidenceLink" data-testid="evidence-cta">
      <div>
        <h3 style="margin:0 0 6px;font-size:16px">任务已完成</h3>
        <p style="margin:0;color:var(--muted)">
          可进入证据库查看对应阶段图片；参数与日志仍保留在本页供复核。
        </p>
      </div>
      <el-button type="primary" @click="$router.push(evidenceLink)">打开证据库</el-button>
    </div>

    <div class="panel" style="margin-bottom: 16px" v-if="task">
      <h3 style="margin:0 0 10px;font-size:16px">参数</h3>
      <pre class="mono params">{{ JSON.stringify(task.params, null, 2) }}</pre>
    </div>

    <div class="panel" style="margin-bottom: 16px">
      <div class="page-header" style="margin-bottom:8px">
        <h3 style="margin:0;font-size:16px">运行日志</h3>
        <el-switch v-model="autoScroll" active-text="自动滚底" />
      </div>
      <div ref="logRef" class="log-box">{{ logText || '暂无日志' }}</div>
    </div>

    <div class="panel" v-if="task?.result_summary && Object.keys(task.result_summary).length">
      <h3 style="margin:0 0 10px;font-size:16px">结果摘要</h3>
      <pre class="mono params">{{ JSON.stringify(task.result_summary, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import {
  evidenceLocationFromTask,
  isSuccessfulTask,
} from '@/utils/taskFlow.js'

const route = useRoute()
const taskId = route.params.id
const task = ref(null)
const logText = ref('')
const logRef = ref(null)
const autoScroll = ref(true)
let timer

const evidenceLink = computed(() =>
  task.value && isSuccessfulTask(task.value)
    ? evidenceLocationFromTask(task.value)
    : null,
)

async function refresh() {
  task.value = await api.task(taskId)
  const logs = await api.taskLogs(taskId, 800)
  logText.value = logs.text || ''
  if (autoScroll.value) {
    await nextTick()
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
  }
}

async function stop() {
  await api.stopTask(taskId)
  ElMessage.success('已发送停止信号')
  refresh()
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 2500)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.params {
  background: #f8fafc;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  max-height: 280px;
}
.evidence-cta {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}
</style>
