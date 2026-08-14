<script setup>
import { computed } from 'vue'

import StatePanel from '../common/StatePanel.vue'
import EChartFrame from './EChartFrame.vue'
import { buildHeatmapOption } from '../../utils/charts.js'

const props = defineProps({
  matrix: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

const option = computed(() =>
  props.matrix?.exists && Array.isArray(props.matrix.points) && props.matrix.points.length
    ? buildHeatmapOption(props.matrix)
    : null,
)
</script>

<template>
  <section class="chart-block" data-testid="similarity-matrix">
    <header>
      <p>SIMILARITY</p>
      <h3>相似度矩阵切片</h3>
    </header>
    <StatePanel
      v-if="loading"
      state="loading"
      title="正在载入矩阵"
      description="读取相似度矩阵切片。"
    />
    <StatePanel
      v-else-if="error"
      state="error"
      title="矩阵载入失败"
      :description="error"
    />
    <StatePanel
      v-else-if="!option"
      state="empty"
      title="暂无矩阵切片"
      description="需要本地 sm.pkl。选定类别对后会显示该对附近的矩阵切片。"
    />
    <EChartFrame v-else :option="option" height="360px" />
  </section>
</template>

<style scoped>
.chart-block {
  display: grid;
  gap: var(--space-3);
}

.chart-block header p {
  margin: 0;
  font-size: var(--text-xs);
  letter-spacing: 0.1em;
  color: var(--color-accent-ink);
}

.chart-block h3 {
  margin: var(--space-1) 0 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
}
</style>
