import { getCurrentScope, onMounted, ref } from 'vue'

import { api } from '@/api'
import {
  buildLabelMap,
  formatClassId,
  formatClassPair,
} from '../utils/labels.js'

let cachedMap = null
let pending = null

const loadLabelMap = async (apiClient = api) => {
  if (cachedMap) return cachedMap
  if (!pending) {
    pending = Promise.resolve(apiClient.labels())
      .then((rows) => {
        cachedMap = buildLabelMap(rows)
        return cachedMap
      })
      .catch(() => {
        pending = null
        return new Map()
      })
  }
  return pending
}

export const useClassLabels = ({ apiClient = api, immediate = true } = {}) => {
  const labels = ref(cachedMap || new Map())

  const refresh = async () => {
    labels.value = await loadLabelMap(apiClient)
    return labels.value
  }

  const formatClass = (id) => formatClassId(id, labels.value)
  const formatPair = (classA, classB) =>
    formatClassPair(classA, classB, labels.value)

  if (immediate) {
    if (getCurrentScope()) {
      onMounted(() => {
        void refresh()
      })
    } else {
      void refresh()
    }
  }

  return {
    labels,
    formatClass,
    formatPair,
    refresh,
  }
}
