<script setup>
import * as echarts from 'echarts/core'
import { BarChart, HeatmapChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

echarts.use([
  BarChart,
  HeatmapChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
])

const props = defineProps({
  option: {
    type: Object,
    default: null,
  },
  height: {
    type: String,
    default: '320px',
  },
})

const host = ref(null)
let chart = null

const render = () => {
  if (!host.value) return
  if (!chart) {
    chart = echarts.init(host.value)
  }
  if (props.option) {
    chart.setOption(props.option, true)
  } else {
    chart.clear()
  }
}

const resize = () => {
  chart?.resize()
}

onMounted(() => {
  render()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})

watch(
  () => props.option,
  () => {
    render()
  },
  { deep: true },
)
</script>

<template>
  <div
    ref="host"
    class="echart-frame"
    data-testid="echart-frame"
    :style="{ height }"
    role="img"
    aria-label="研究图表"
  />
</template>

<style scoped>
.echart-frame {
  width: 100%;
  min-height: 240px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-warm);
  border: 1px solid var(--color-line);
}
</style>
