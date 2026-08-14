import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: '/',
  timeout: 60000,
})

http.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && typeof body.success === 'boolean' && !body.success) {
      ElMessage.error(body.message || '请求失败')
      return Promise.reject(body)
    }
    return body?.data !== undefined ? body.data : body
  },
  (err) => {
    ElMessage.error(err?.response?.data?.message || err.message || '网络错误')
    return Promise.reject(err)
  },
)

export const api = {
  health: () => http.get('/api/health'),
  models: () => http.get('/api/models'),
  model: (id) => http.get(`/api/models/${id}`),
  labels: () => http.get('/api/labels'),
  checkpoints: (net) => http.get('/api/checkpoints', { params: { net } }),
  similarity: (net, top_k = 30, min_sim = 0.5) =>
    http.get('/api/similarity', { params: { net, top_k, min_sim } }),
  similarityMatrix: (net, options = {}) =>
    http.get('/api/similarity/matrix', { params: { ...options, net } }),
  diffMap: (net) => http.get('/api/diff-map', { params: { net } }),
  diffMapPairs: (net, options = {}) =>
    http.get('/api/diff-map/pairs', { params: { ...options, net } }),
  diffMapPair: (net, classA, classB) =>
    http.get(`/api/diff-map/pairs/${classA}/${classB}`, { params: { net } }),
  fuzzingResults: (net) => http.get('/api/fuzzing/results', { params: { net } }),
  unswResults: () => http.get('/api/unsw/results'),
  artifactImages: (rel_dir = 'results', limit = 400, options = {}) =>
    http.get('/api/artifacts/images', {
      params: { rel_dir, limit, images_only: true, ...options },
    }),
  artifactText: (path) => http.get('/api/artifacts/text', { params: { path } }),
  fileUrl: (rel) => `/api/files/${rel}`.replace(/\\/g, '/'),
  tasks: (task_type) => http.get('/api/tasks', { params: task_type ? { task_type } : {} }),
  task: (id) => http.get(`/api/tasks/${id}`),
  taskLogs: (id, tail = 500) => http.get(`/api/tasks/${id}/logs`, { params: { tail } }),
  taskResult: (id) => http.get(`/api/tasks/${id}/result`),
  createTask: (payload) => http.post('/api/tasks', payload),
  stopTask: (id) => http.post(`/api/tasks/${id}/stop`),
  deleteTasks: (task_ids) => http.delete('/api/tasks', { data: { task_ids } }),
}

export default http
