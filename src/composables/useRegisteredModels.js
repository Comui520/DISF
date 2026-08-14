import { getCurrentScope, onMounted, ref } from 'vue'

import { api } from '@/api'
import { FALLBACK_REGISTERED_MODELS } from '../utils/models.js'

let cachedModels = null
let pending = null

const normalizeRows = (rows) => {
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => row && String(row.net || '').trim())
}

const loadRegisteredModels = async (apiClient = api) => {
  if (cachedModels) return cachedModels
  if (!pending) {
    pending = Promise.resolve()
      .then(() => apiClient.models())
      .then((rows) => {
        const list = normalizeRows(rows)
        cachedModels = list.length ? list : [...FALLBACK_REGISTERED_MODELS]
        return cachedModels
      })
      .catch(() => {
        pending = null
        return [...FALLBACK_REGISTERED_MODELS]
      })
  }
  return pending
}

export const useRegisteredModels = ({
  apiClient = api,
  immediate = true,
} = {}) => {
  const models = ref(cachedModels ? [...cachedModels] : [...FALLBACK_REGISTERED_MODELS])

  const refresh = async () => {
    models.value = await loadRegisteredModels(apiClient)
    return models.value
  }

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
    models,
    refresh,
  }
}
