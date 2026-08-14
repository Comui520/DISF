const DEMO_LABEL = '示例数据'
const DEMO_NOTICE = '以下内容仅用于界面预览，不代表真实实验结论。'

const demoMark = () => ({
  demo: true,
  demoLabel: DEMO_LABEL,
  notice: DEMO_NOTICE,
})

const artifact = (path, metadata) => ({
  ...demoMark(),
  path,
  name: path.split('/').at(-1),
  mtime: 0,
  size: 0,
  ...metadata,
})

/** Preview file under NAD image/ when the logical demo path is synthetic. */
const withPreview = (logicalPath, previewPath, metadata) =>
  artifact(logicalPath, {
    previewPath,
    name: logicalPath.split('/').at(-1),
    ...metadata,
  })

const matrixPoints = [
  { x: 119, y: 119, value: 1 },
  { x: 119, y: 332, value: 0.62 },
  { x: 332, y: 119, value: 0.62 },
  { x: 332, y: 332, value: 1 },
]

export const demoArtifacts = {
  ...demoMark(),
  artifacts: [
    artifact('image/vgg16_masks.png', {
      stage: 'subarch',
      model: 'vgg16',
      kind: 'mask',
    }),
    artifact('image/resnet50_masks.pdf', {
      stage: 'subarch',
      model: 'resnet50',
      kind: 'mask',
    }),
    artifact('image/disf_framework_3stage.png', {
      stage: 'guide',
      kind: 'framework',
    }),
    artifact('image/similar_subarch_119.png', {
      stage: 'subarch',
      model: 'vgg16',
      classA: 119,
      kind: 'similar-subarch',
    }),
    withPreview('demo/causal/119_vs_332_heatmap.png', 'image/similar_subarch_119.png', {
      stage: 'causal',
      model: 'vgg16',
      classA: 119,
      classB: 332,
      layer: 'mask.10',
      kind: 'heatmap',
      title: '因果干预热力图 · 示例',
      isImage: true,
    }),
    withPreview('demo/fuzzing/119_vs_332_compare.png', 'image/vgg16_masks.png', {
      stage: 'fuzzing',
      model: 'vgg16',
      classA: 119,
      classB: 332,
      kind: 'comparison',
      title: '模糊测试对比图 · 示例',
      isImage: true,
    }),
  ],
  matrix: {
    ...demoMark(),
    exists: true,
    net: 'vgg16',
    format: 'slice',
    shape: [2, 2],
    class_ids: [119, 332],
    points: matrixPoints,
    entries: matrixPoints,
    total: matrixPoints.length,
    truncated: false,
  },
  diffPair: {
    ...demoMark(),
    exists: true,
    net: 'vgg16',
    classA: 119,
    classB: 332,
    pair: {
      class_a: 119,
      class_b: 332,
      layer: 'mask.10',
      summary: '演示类别对，仅用于验证信息布局。',
      top_channels: [
        {
          channel: 7,
          effect_a: 0.22,
          effect_b: -0.31,
          causal_score: 0.88,
        },
        {
          channel: 4,
          effect_a: 0.11,
          effect_b: 0.08,
          causal_score: 0.41,
        },
      ],
    },
  },
  fuzzing: {
    ...demoMark(),
    net: 'vgg16',
    classA: 119,
    classB: 332,
    params: {
      sampleCount: 2,
      mode: 'preview',
    },
    images: [
      'image/similar_subarch_119.png',
      'image/vgg16_masks.png',
    ],
  },
  panels: {
    image: {
      ...demoMark(),
      artifact: 'image/similar_subarch_119.png',
    },
    insight: {
      ...demoMark(),
      text: '此处展示如何呈现产物上下文，不对实验结果作判断。',
    },
    chart: {
      ...demoMark(),
      data: 'matrix',
    },
    params: {
      ...demoMark(),
      data: 'fuzzing.params',
    },
  },
}

export { DEMO_LABEL, DEMO_NOTICE }

export default demoArtifacts
