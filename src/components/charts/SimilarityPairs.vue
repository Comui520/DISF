<script setup>
import { computed } from 'vue'

import StatePanel from '../common/StatePanel.vue'
import EChartFrame from './EChartFrame.vue'
import { buildPairBarsOption } from '../../utils/charts.js'

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
  limit: {
    type: Number,
    default: 12,
  },
})

const option = computed(() =>
  props.matrix?.exists && Array.isArray(props.matrix.points) && props.matrix.points.length
    ? buildPairBarsOption(props.matrix, { limit: props.limit })
    : null,
)
</script>

<template>
  <section class="chart-block" data-testid="similarity-pairs">
    <header>
      <p>TOP PAIRS</p>
      <h3>高相似类别对</h3>
    </header>
    <StatePanel
      v-if="loading"
      state="loading"
      title="正在载入类别对"
      description="整理矩阵中的高相似对。"
    />
    <StatePanel
      v-else-if="error"
      state="error"
      title="类别对载入失败"
      :description="error"
    />
    <StatePanel
      v-else-if="!option"
      state="empty"
      title="暂无高相似类别对"
      description="缺少相似度矩阵时，这里保持空态。"
    />
    <EChartFrame v-else :option="option" height="300px" />
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
