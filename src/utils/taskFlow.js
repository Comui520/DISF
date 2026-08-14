import { workspaceLocation } from './workspace.js'

export const TASK_TYPE_META = Object.freeze({
  nad_mask: Object.freeze({
    label: 'NAD Mask 训练',
    stage: 'subarch',
  }),
  subarch_sim: Object.freeze({
    label: '相似度矩阵',
    stage: 'subarch',
  }),
  causal_pipeline: Object.freeze({
    label: '因果流水线',
    stage: 'causal',
  }),
  causal_fuzz: Object.freeze({
    label: '因果模糊测试',
    stage: 'fuzzing',
  }),
  export_fuzz_images: Object.freeze({
    label: '导出模糊测试图像',
    stage: 'fuzzing',
  }),
  unsw_pipeline: Object.freeze({
    label: 'UNSW 流水线',
    stage: 'uncategorized',
  }),
})

export const ALL_TASK_TYPES = Object.freeze(Object.keys(TASK_TYPE_META))

const firstNumber = (...values) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
      return Number(value)
    }
  }
  return null
}

const firstText = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return null
}

export const researchContextFromTask = (task = {}) => {
  const params = task?.params && typeof task.params === 'object' ? task.params : {}
  const meta = TASK_TYPE_META[task.task_type] || { stage: 'uncategorized' }
  return {
    model: firstText(params.net, params.model, task.model),
    stage: meta.stage,
    classA: firstNumber(params.class_a, params.classA, params.class_id, params.start_class),
    classB: firstNumber(params.class_b, params.classB, params.end_class),
    panel: 'image',
  }
}

export const evidenceLocationFromTask = (task = {}) => {
  const context = researchContextFromTask(task)
  return workspaceLocation('evidence', context)
}

export const isSuccessfulTask = (task = {}) =>
  ['succeeded', 'success', 'completed', 'done'].includes(
    String(task?.status || '').toLowerCase(),
  )
