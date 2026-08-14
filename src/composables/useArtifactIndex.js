import { getCurrentScope, onScopeDispose, ref, unref, watch } from 'vue'

import { api } from '../api/index.js'
import { demoArtifacts } from '../fixtures/demoArtifacts.js'
import {
  CASE_INDEX_DIRS,
  STAGE_INDEX_DIRS,
  buildArtifactIndex,
} from '../utils/artifacts.js'

const asArray = (value) => {
  if (Array.isArray(value)) {
    return value
  }
  if (Array.isArray(value?.items)) {
    return value.items
  }
  if (Array.isArray(value?.results)) {
    return value.results
  }
  return []
}

const withSource = (items, source) =>
  asArray(items).map((item) => ({
    ...item,
    source: item?.source || source,
  }))

const fuzzingRelation = (entry) =>
  Object.fromEntries(
    [
      ['fuzzingResultPath', entry.path],
      ['fuzzingResultName', entry.name],
      ['fuzzingResultSize', entry.size],
      ['fuzzingResultMtime', entry.mtime],
      ['fuzzingNumErrors', entry.num_errors],
      ['fuzzingError', entry.error],
    ].filter(([, value]) => value !== undefined),
  )

const expandFuzzingResults = (value, net) =>
  asArray(value).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return []
    }
    const { images = [], kind: parentKind } = entry
    const imageItems = asArray(images).map((image) => {
      const imageData = typeof image === 'string' ? { path: image } : image
      const imagePath = imageData?.path || imageData?.name
      if (!imagePath) {
        return null
      }
      return {
        ...imageData,
        path: imagePath,
        name:
          imageData.name ||
          String(imagePath).replace(/\\/g, '/').split('/').at(-1),
        model: imageData.model || entry.model || net,
        stage: imageData.stage || 'fuzzing',
        source: imageData.source || 'fuzzing',
        ...fuzzingRelation(entry),
      }
    })

    // Library/case index only needs image siblings — skip pkl parents.
    return imageItems.filter(Boolean)
  })

const startRequest = (request) => {
  try {
    return Promise.resolve(request())
  } catch (error) {
    return Promise.reject(error)
  }
}

const requestError = (source, reason) => ({
  source,
  message:
    reason instanceof Error ? reason.message : String(reason ?? '请求失败'),
  error: reason,
})

const resolveRelDirs = (stage, override) => {
  if (override === 'case') {
    return [...CASE_INDEX_DIRS]
  }
  if (Array.isArray(override)) {
    return override
  }
  if (stage && STAGE_INDEX_DIRS[stage]) {
    return [...STAGE_INDEX_DIRS[stage]]
  }
  return [...CASE_INDEX_DIRS]
}

export const loadArtifactIndex = async (
  apiClient,
  net = 'vgg16',
  {
    relDirs = null,
    stage = null,
    includeImageRoot = false,
    includeFuzzingApi = false,
    limit = 600,
  } = {},
) => {
  const dirs = resolveRelDirs(stage, relDirs)
  const sources = dirs.map((dir) => ({
    name: dir,
    request: startRequest(() =>
      apiClient.artifactImages(dir, limit, {
        images_only: true,
        offset: 0,
      }),
    ),
  }))

  if (includeImageRoot) {
    sources.push({
      name: 'image',
      request: startRequest(() =>
        apiClient.artifactImages('image', 80, { images_only: true }),
      ),
    })
  }

  if (includeFuzzingApi) {
    sources.push({
      name: 'fuzzing',
      request: startRequest(() => apiClient.fuzzingResults(net)),
    })
  }

  const settled = await Promise.allSettled(
    sources.map(({ request }) => request),
  )
  const groups = []
  const errors = []

  settled.forEach((result, index) => {
    const source = sources[index].name
    if (result.status === 'rejected') {
      errors.push(requestError(source, result.reason))
      return
    }
    groups.push(
      source === 'fuzzing'
        ? expandFuzzingResults(result.value, net)
        : withSource(result.value, source),
    )
  })

  return {
    items: buildArtifactIndex(groups),
    errors,
  }
}

const envDemoMode = import.meta.env?.VITE_DEMO_MODE === 'true'

export const useArtifactIndex = ({
  apiClient = api,
  net = 'vgg16',
  demoMode = envDemoMode,
  immediate = true,
  stage = null,
  relDirs = null,
  includeImageRoot = false,
  includeFuzzingApi = false,
  limit = 600,
} = {}) => {
  const enabledDemoMode = demoMode === true || demoMode === 'true'
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)
  const isDemo = ref(enabledDemoMode)
  const demoData = ref(enabledDemoMode ? demoArtifacts : null)
  let refreshSequence = 0
  let scopeActive = true
  const isCurrentRefresh = (sequence) =>
    scopeActive && sequence === refreshSequence
  const resolveNet = () => {
    const value = typeof net === 'function' ? net() : unref(net)
    return value || 'vgg16'
  }
  const resolveStage = () => {
    const value = typeof stage === 'function' ? stage() : unref(stage)
    return value || null
  }
  const resolveRelDirs = () => {
    const value = typeof relDirs === 'function' ? relDirs() : unref(relDirs)
    return value
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      scopeActive = false
      refreshSequence += 1
      loading.value = false
    })
  }

  const refresh = async () => {
    if (!scopeActive) {
      return { items: items.value, errors: [] }
    }
    const sequence = ++refreshSequence
    loading.value = true
    error.value = null

    try {
      if (enabledDemoMode) {
        items.value = buildArtifactIndex([demoArtifacts.artifacts])
        isDemo.value = true
        demoData.value = demoArtifacts
        return { items: items.value, errors: [] }
      }

      const result = await loadArtifactIndex(apiClient, resolveNet(), {
        stage: resolveStage(),
        relDirs: resolveRelDirs(),
        includeImageRoot,
        includeFuzzingApi,
        limit,
      })
      if (isCurrentRefresh(sequence)) {
        items.value = result.items
        error.value = result.errors.length ? result.errors : null
        isDemo.value = false
        demoData.value = null
      }
      return result
    } catch (reason) {
      const errors = [requestError('artifact-index', reason)]
      if (isCurrentRefresh(sequence)) {
        error.value = errors
      }
      return { items: items.value, errors }
    } finally {
      if (isCurrentRefresh(sequence)) {
        loading.value = false
      }
    }
  }

  if (immediate) {
    if (stage || relDirs) {
      watch(
        () => [resolveStage(), resolveRelDirs(), resolveNet()],
        () => {
          void refresh()
        },
        { immediate: true },
      )
    } else {
      void refresh()
    }
  }

  return {
    items,
    loading,
    error,
    isDemo,
    demoData,
    refresh,
  }
}
