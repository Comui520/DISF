<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">DISF</div>
        <div class="sub">图片证据优先 · 因果模糊测试</div>
      </div>

      <nav aria-label="研究主入口">
        <router-link
          v-for="item in primaryMenus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="nav-group">
        <div class="nav-group__label">专家工具</div>
        <nav aria-label="专家工具">
          <router-link
            v-for="item in expertMenus"
            :key="item.path"
            :to="item.path"
            class="nav-item nav-item--expert"
            :class="{ active: isActive(item.path) }"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </router-link>
        </nav>
      </div>

      <div class="side-foot">
        <div class="mono">NAD 只读调用</div>
        <div class="mono status" :class="healthOk ? 'ok' : 'bad'">
          {{ healthText }}
        </div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <div class="crumb">{{ currentTitle }}</div>
          <div class="hint">前端只读展示；后端与算法请自行对接</div>
        </div>
        <div class="actions">
          <el-button size="small" @click="refreshHealth">刷新状态</el-button>
          <el-button size="small" @click="$router.push('/evidence')">证据库</el-button>
          <el-button size="small" type="primary" @click="$router.push('/tasks')">
            任务中心
          </el-button>
        </div>
      </header>
      <section class="content">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'

const route = useRoute()
const healthOk = ref(false)
const healthText = ref('检测中…')

const primaryMenus = [
  { path: '/evidence', label: '证据库', icon: 'Picture' },
  { path: '/case', label: '案例工作区', icon: 'Monitor' },
]

const expertMenus = [
  { path: '/models', label: '模型中心', icon: 'Cpu' },
  { path: '/subarch', label: '子架构分析', icon: 'Share' },
  { path: '/causal', label: '因果图谱', icon: 'Connection' },
  { path: '/fuzzing', label: '模糊测试', icon: 'Aim' },
  { path: '/results', label: '结果浏览', icon: 'FolderOpened' },
  { path: '/tasks', label: '任务中心', icon: 'List' },
]

const currentTitle = computed(() => route.meta?.title || 'DISF')

function isActive(path) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

async function refreshHealth() {
  try {
    const data = await api.health()
    healthOk.value = !!data.nad_exists
    healthText.value = data.nad_exists ? '后端已连接' : '后端未连接'
  } catch (e) {
    healthOk.value = false
    healthText.value = 'API 未连接'
  }
}

onMounted(refreshHealth)
</script>

<style scoped>
.shell {
  display: flex;
  height: 100%;
  min-height: 100vh;
}
.sidebar {
  width: 230px;
  background: linear-gradient(180deg, #0a222c, #10313b 55%, #0d2a33);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
}
.brand {
  padding: 6px 10px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 14px;
}
.logo {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #fff;
  font-family: var(--font-display);
}
.sub {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.72;
  line-height: 1.4;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-group {
  margin-top: 18px;
  flex: 1;
}
.nav-group__label {
  padding: 0 12px 8px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.55;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #c9d6e4;
  font-size: 14px;
}
.nav-item--expert {
  font-size: 13px;
  padding: 8px 12px;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.nav-item.active {
  background: rgba(11, 127, 117, 0.28);
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(145, 199, 191, 0.35);
}
.side-foot {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
  font-size: 11px;
  opacity: 0.85;
  word-break: break-all;
}
.status.ok {
  color: #86efac;
}
.status.bad {
  color: #fca5a5;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
}
.crumb {
  font-size: 16px;
  font-weight: 650;
}
.hint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.actions {
  display: flex;
  gap: 8px;
}
.content {
  flex: 1;
  overflow: auto;
}
</style>
