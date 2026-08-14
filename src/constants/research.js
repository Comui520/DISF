const freezeDefinitions = (definitions) =>
  Object.freeze(definitions.map((definition) => Object.freeze(definition)))

export const RESEARCH_STAGES = freezeDefinitions([
  {
    key: 'subarch',
    order: 1,
    name: '相似子架构',
    description: '整理模型、类别与相似子架构相关的证据产物。',
  },
  {
    key: 'causal',
    order: 2,
    name: '因果干预',
    description: '呈现类别对和网络层级对应的干预证据。',
  },
  {
    key: 'fuzzing',
    order: 3,
    name: '因果模糊测试',
    description: '汇集模糊测试运行及其输入输出对比产物。',
  },
])

/** Non-pipeline library buckets: not part of the research stage spine. */
export const LIBRARY_AUX_SECTIONS = freezeDefinitions([
  {
    key: 'guide',
    name: '说明材料',
    description: '研究框架示意等说明性材料，不是实验流水线产物。',
  },
  {
    key: 'uncategorized',
    name: '未分类',
    description: '路径无法归入三阶段的其他文件。',
  },
])

export const RESEARCH_PANELS = freezeDefinitions([
  {
    key: 'image',
    name: '图像',
    description: '预览图片、热力图和可下载文档。',
  },
  {
    key: 'insight',
    name: '解读',
    description: '显示产物上下文和中性说明。',
  },
  {
    key: 'chart',
    name: '图表',
    description: '以图表方式预览矩阵或类别对数据。',
  },
  {
    key: 'params',
    name: '参数',
    description: '查看生成产物时记录的参数与来源。',
  },
])

const modelLabel = ({ model } = {}) => (model ? `${model} ` : '')
const pairLabel = ({ classA, classB } = {}) =>
  Number.isFinite(classA) && Number.isFinite(classB)
    ? `类别 ${classA} 与 ${classB}`
    : '所选类别'
const layerLabel = ({ layer } = {}) => (layer ? `${layer} 层` : '对应网络层')

export const ARTIFACT_KIND_DEFINITIONS = Object.freeze({
  general: Object.freeze({
    title: '研究产物',
    description: () => '研究流程生成的通用产物，需结合来源和参数进行解读。',
  }),
  mask: Object.freeze({
    title: '模型掩码',
    description: (meta) => `用于查看 ${modelLabel(meta)}模型掩码或通道选择信息。`,
  }),
  framework: Object.freeze({
    title: '研究框架示意图',
    description: () => '用于说明研究流程各阶段关系的示意材料，不是实验流水线输出。',
  }),
  'similar-subarch': Object.freeze({
    title: '相似子架构产物',
    description: (meta) => `用于预览${pairLabel(meta)}相关的子架构信息。`,
  }),
  heatmap: Object.freeze({
    title: '因果干预热力图',
    description: (meta) =>
      `用于查看${pairLabel(meta)}在${layerLabel(meta)}对应的可视化产物。`,
  }),
  comparison: Object.freeze({
    title: '模糊测试对比图',
    description: (meta) => `用于并排预览${pairLabel(meta)}相关的测试图像。`,
  }),
  'similarity-matrix': Object.freeze({
    title: '相似度矩阵',
    description: (meta) => `用于预览 ${modelLabel(meta)}类别间矩阵数据。`,
  }),
  'diff-pair': Object.freeze({
    title: '差异类别对',
    description: (meta) => `记录${pairLabel(meta)}对应的差异数据与参数。`,
  }),
  'fuzzing-result': Object.freeze({
    title: '模糊测试记录',
    description: (meta) => `记录 ${modelLabel(meta)}模糊测试运行的产物索引。`,
  }),
  parameters: Object.freeze({
    title: '产物参数',
    description: () => '记录生成或读取该产物时使用的参数。',
  }),
})

export const RESEARCH_STAGE_KEYS = Object.freeze(
  RESEARCH_STAGES.map(({ key }) => key),
)

export const LIBRARY_AUX_SECTION_KEYS = Object.freeze(
  LIBRARY_AUX_SECTIONS.map(({ key }) => key),
)

export const LIBRARY_STAGE_KEYS = Object.freeze([
  ...RESEARCH_STAGE_KEYS,
  ...LIBRARY_AUX_SECTION_KEYS,
])

export const STAGE_LABELS = Object.freeze(
  Object.fromEntries(
    [...RESEARCH_STAGES, ...LIBRARY_AUX_SECTIONS].map((item) => [
      item.key,
      item.name,
    ]),
  ),
)

export const RESEARCH_PANEL_KEYS = Object.freeze(
  RESEARCH_PANELS.map(({ key }) => key),
)
