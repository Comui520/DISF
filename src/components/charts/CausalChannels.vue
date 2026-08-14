<script setup>
import { computed } from 'vue'

import StatePanel from '../common/StatePanel.vue'
import EChartFrame from './EChartFrame.vue'
import { buildCausalChannelsOption } from '../../utils/charts.js'

const props = defineProps({
  pair: {
    type: Object,
    default: null,
  },
  classA: {
    type: [Number, String],
    default: null,
  },
  classB: {
    type: [Number, String],
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

const option = computed(() => {
  const payload = props.pair?.pair || props.pair
  if (!payload?.top_channels?.length) return null
  return buildCausalChannelsOption(payload, {
    classA: props.classA ?? payload.class_a,
    classB: props.classB ?? payload.class_b,
  })
})
</script>

<template>
  <section class="chart-block" data-testid="causal-channels">
    <header>
      <p>CAUSAL CHANNELS</p>
      <h3>Top 通道双向效应</h3>
    </header>
    <StatePanel
      v-if="loading"
      state="loading"
      title="正在载入通道效应"
      description="读取当前类别对的 diff-map 摘要。"
    />
    <StatePanel
      v-else-if="error"
      state="error"
      title="通道效应载入失败"
      :description="error"
    />
    <StatePanel
      v-else-if="!option"
      state="empty"
      title="暂无通道效应"
      description="选定类别对并具备 diff_map.pkl 后，可在此查看 Top 通道双向效应。"
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
