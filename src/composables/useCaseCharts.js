import { computed, ref, watch } from 'vue'

import { api } from '../api/index.js'
import { demoArtifacts } from '../fixtures/demoArtifacts.js'

const envDemoMode = import.meta.env?.VITE_DEMO_MODE === 'true'

export const useCaseCharts = ({
  context,
  apiClient = api,
  demoMode = envDemoMode,
  immediate = true,
} = {}) => {
  const enabledDemoMode = demoMode === true || demoMode === 'true'
  const matrix = ref(null)
  const pair = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const net = computed(() => context?.value?.model || 'vgg16')
  const classA = computed(() => context?.value?.classA)
  const classB = computed(() => context?.value?.classB)

  const refresh = async () => {
    loading.value = true
    error.value = null
    try {
      if (enabledDemoMode) {
        matrix.value = demoArtifacts.matrix
        pair.value =
          Number.isFinite(classA.value) && Number.isFinite(classB.value)
            ? demoArtifacts.diffPair
            : null
        return { matrix: matrix.value, pair: pair.value }
      }

      const classIds =
        Number.isFinite(classA.value) && Number.isFinite(classB.value)
          ? `${classA.value},${classB.value}`
          : undefined

      const matrixRequest = classIds
        ? apiClient.similarityMatrix(net.value, {
            format: 'slice',
            class_ids: classIds,
            limit: 100,
          })
        : apiClient.similarityMatrix(net.value, {
            format: 'sparse',
            min_sim: 0.5,
            limit: 30,
          })

      const pairRequest =
        Number.isFinite(classA.value) && Number.isFinite(classB.value)
          ? apiClient.diffMapPair(net.value, classA.value, classB.value)
          : Promise.resolve(null)

      const [matrixResult, pairResult] = await Promise.all([
        matrixRequest,
        pairRequest,
      ])
      matrix.value = matrixResult
      pair.value = pairResult
      return { matrix: matrix.value, pair: pair.value }
    } catch (reason) {
      error.value =
        reason instanceof Error ? reason.message : String(reason ?? '图表载入失败')
      return { matrix: matrix.value, pair: pair.value }
    } finally {
      loading.value = false
    }
  }

  if (immediate && context) {
    watch(
      () => [
        context.value?.model,
        context.value?.classA,
        context.value?.classB,
        context.value?.panel,
      ],
      ([, , , panel]) => {
        if (panel === 'chart' || panel == null) {
          void refresh()
        }
      },
      { immediate: true },
    )
  }

  return {
    matrix,
    pair,
    loading,
    error,
    refresh,
  }
}
