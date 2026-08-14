import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layout/MainLayout.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/evidence',
    children: [
      {
        path: 'evidence',
        name: 'evidence',
        component: () => import('../views/EvidenceLibraryView.vue'),
        meta: { title: '证据库' },
      },
      {
        path: 'case',
        name: 'case',
        component: () => import('../views/CaseWorkspaceView.vue'),
        meta: { title: '案例工作区' },
      },
      {
        path: 'models',
        name: 'models',
        component: () => import('../views/ModelCenter.vue'),
        meta: { title: '模型中心', expert: true },
      },
      {
        path: 'subarch',
        name: 'subarch',
        component: () => import('../views/SubarchView.vue'),
        meta: { title: '子架构分析', expert: true },
      },
      {
        path: 'causal',
        name: 'causal',
        component: () => import('../views/CausalView.vue'),
        meta: { title: '因果图谱', expert: true },
      },
      {
        path: 'fuzzing',
        name: 'fuzzing',
        component: () => import('../views/FuzzingView.vue'),
        meta: { title: '模糊测试', expert: true },
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('../views/TaskListView.vue'),
        meta: { title: '任务中心', expert: true },
      },
      {
        path: 'tasks/:id',
        name: 'task-detail',
        component: () => import('../views/TaskDetailView.vue'),
        meta: { title: '任务详情', expert: true },
      },
      {
        path: 'results',
        name: 'results',
        component: () => import('../views/ResultsView.vue'),
        meta: { title: '结果浏览', expert: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
