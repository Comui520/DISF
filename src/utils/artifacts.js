import { ARTIFACT_KIND_DEFINITIONS } from '../constants/research.js'

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
])

const hasValue = (value) =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  (!Array.isArray(value) || value.length > 0)

const normalizePath = (path) =>
  String(path ?? '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')

const basename = (path) => normalizePath(path).split('/').at(-1) || ''

const extension = (path) => {
  const filename = basename(path).toLowerCase()
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex >= 0 ? filename.slice(dotIndex) : ''
}

const normalizeClassId = (value) => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null
  }
  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) {
    return null
  }
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

const inferStage = (path) => {
  const lower = path.toLowerCase()
  if (
    lower.includes('similarsubarch') ||
    lower.includes('similar_subarch') ||
    lower.includes('similarity_') ||
    /(?:^|\/)(?:vgg\d+|resnet\d+)_masks\.(?:png|pdf)$/.test(lower) ||
    /^image\/(?:vgg\d+|resnet\d+)_masks\.(?:png|pdf)$/.test(lower)
  ) {
    return 'subarch'
  }
  if (
    lower.includes('causal_intervention') ||
    lower.includes('/causal/') ||
    lower.includes('channel_causal') ||
    lower.includes('layer_causal') ||
    lower.includes('/heatmaps/') ||
    /\d+[_-]vs[_-]\d+.*mask\.\d+/.test(lower)
  ) {
    return 'causal'
  }
  if (lower.includes('fuzzing')) {
    return 'fuzzing'
  }
  if (
    lower.includes('framework') ||
    lower.includes('ablation') ||
    lower.includes('/figures/disf_')
  ) {
    return 'guide'
  }
  return 'uncategorized'
}

const inferModel = (path) => {
  const placeMatch = path.match(/(?:^|\/)place\/([^/]+)/i)
  if (placeMatch) {
    return placeMatch[1]
  }

  if (
    /(?:^|\/)(?:disf_unsw|unsw_bilstm|cnn[_-]?bilstm)(?:[\/._-]|$)/i.test(path)
  ) {
    return 'cnn_bilstm'
  }

  const modelMatch = path.match(
    /(?:^|\/)(cnn[_-]?bilstm|vgg\d+(?:_bn)?|resnet\d+|densenet\d+|mobilenet(?:_v\d+)?|alexnet|inception(?:_v\d+)?|efficientnet(?:_b\d+)?)(?=[_.\-/]|$)/i,
  )
  if (!modelMatch) return null
  const token = modelMatch[1].toLowerCase().replace(/-/g, '_')
  return token === 'cnn_bilstm' ? 'cnn_bilstm' : modelMatch[1]
}

const inferClasses = (path) => {
  const pairMatch = path.match(/(\d+)[_-](?:vs|to)[_-](\d+)/i)
  if (pairMatch) {
    return {
      classA: Number(pairMatch[1]),
      classB: Number(pairMatch[2]),
    }
  }

  const singleClassMatch = path.match(
    /(?:similar[_-]?subarch|class)[_-]?(\d+)/i,
  )
  if (singleClassMatch) {
    return {
      classA: Number(singleClassMatch[1]),
      classB: null,
    }
  }

  // similarSubArch/place/<net>/<classId>/similar_subarch.png
  const folderClassMatch = path.match(
    /similarSubArch\/[^/]+\/[^/]+\/(\d+)\//i,
  )
  if (folderClassMatch) {
    return {
      classA: Number(folderClassMatch[1]),
      classB: null,
    }
  }

  return {
    classA: null,
    classB: null,
  }
}

const inferLayer = (path) => {
  const match = path.match(
    /(?:^|[^a-z0-9])(mask|layer)[._-]?(\d+)(?=$|[^a-z0-9])/i,
  )
  return match ? `${match[1].toLowerCase()}.${match[2]}` : null
}

const inferKind = (path) => {
  const lower = path.toLowerCase()
  if (lower.includes('framework')) {
    return 'framework'
  }
  if (lower.includes('heatmap')) {
    return 'heatmap'
  }
  if (lower.includes('compare') || lower.includes('comparison')) {
    return 'comparison'
  }
  if (
    lower.includes('similarsubarch') ||
    lower.includes('similar_subarch')
  ) {
    return 'similar-subarch'
  }
  if (lower.includes('similarity') && lower.includes('matrix')) {
    return 'similarity-matrix'
  }
  if (lower.includes('diff_map') || lower.includes('diff-map')) {
    return 'diff-pair'
  }
  if (lower.includes('fuzzing') && extension(lower) === '.pkl') {
    return 'fuzzing-result'
  }
  if (/(?:^|[_/-])masks?(?:[_.\-/]|$)/i.test(lower)) {
    return 'mask'
  }
  return 'general'
}

const inferredTitle = (definition, meta) => {
  const context = [
    meta.model,
    Number.isFinite(meta.classA) && Number.isFinite(meta.classB)
      ? `${meta.classA} ↔ ${meta.classB}`
      : Number.isFinite(meta.classA)
        ? `类别 ${meta.classA}`
        : null,
    meta.layer,
  ].filter(Boolean)
  return context.length
    ? `${definition.title} · ${context.join(' · ')}`
    : definition.title
}

export const inferArtifactMeta = (raw = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const pathForInference = normalizePath(source.path || source.name)
  const inferredClasses = inferClasses(pathForInference)
  const classA = hasValue(source.classA)
    ? normalizeClassId(source.classA)
    : inferredClasses.classA
  const classB = hasValue(source.classB)
    ? normalizeClassId(source.classB)
    : inferredClasses.classB
  const kind = hasValue(source.kind)
    ? source.kind
    : inferKind(pathForInference)
  const stage = hasValue(source.stage)
    ? source.stage
    : kind === 'framework'
      ? 'guide'
      : inferStage(pathForInference)
  const model = hasValue(source.model)
    ? source.model
    : inferModel(pathForInference)
  const layer = hasValue(source.layer)
    ? source.layer
    : inferLayer(pathForInference)
  const fileExtension = extension(pathForInference)
  const definition =
    ARTIFACT_KIND_DEFINITIONS[kind] ??
    ARTIFACT_KIND_DEFINITIONS.general
  const meta = {
    stage,
    model,
    classA,
    classB,
    layer,
    kind,
  }

  return {
    ...source,
    id:
      source.id ||
      `artifact:${pathForInference.toLowerCase() || basename(source.name)}`,
    stage,
    model,
    classA,
    classB,
    layer,
    kind,
    title: hasValue(source.title)
      ? source.title
      : inferredTitle(definition, meta),
    description: hasValue(source.description)
      ? source.description
      : definition.description(meta),
    isImage:
      typeof source.isImage === 'boolean'
        ? source.isImage
        : IMAGE_EXTENSIONS.has(fileExtension),
    isPdf:
      typeof source.isPdf === 'boolean'
        ? source.isPdf
        : fileExtension === '.pdf',
  }
}

const flattenGroups = (groups) => {
  const groupList = Array.isArray(groups)
    ? groups
    : groups && typeof groups === 'object'
      ? Object.values(groups)
      : []

  return groupList.flatMap((group) => {
    if (Array.isArray(group)) {
      return group
    }
    return group && typeof group === 'object' ? [group] : []
  })
}

const completeness = (item) =>
  Object.entries(item).reduce(
    (score, [key, value]) =>
      key === 'mtime' || !hasValue(value) ? score : score + 1,
    0,
  )

const mtimeValue = (item) => {
  const numeric = Number(item?.mtime)
  if (Number.isFinite(numeric)) {
    return numeric
  }
  const parsed = Date.parse(item?.mtime)
  return Number.isNaN(parsed) ? 0 : parsed
}

const FILE_STATE_FIELDS = new Set(['size', 'mtime'])

const semanticValues = (item) =>
  Object.fromEntries(
    Object.entries(item).filter(
      ([key, value]) => !FILE_STATE_FIELDS.has(key) && hasValue(value),
    ),
  )

const mergeDuplicate = (current, candidate) => {
  const currentScore = completeness(current)
  const candidateScore = completeness(candidate)
  const currentMtime = mtimeValue(current)
  const candidateMtime = mtimeValue(candidate)
  const candidateWins =
    candidateMtime > currentMtime ||
    (candidateMtime === currentMtime &&
      candidateScore >= currentScore)
  const preferred = candidateWins ? candidate : current
  const fallback = candidateWins ? current : candidate

  const merged = {
    ...semanticValues(fallback),
    ...semanticValues(preferred),
  }
  for (const field of FILE_STATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(preferred, field)) {
      merged[field] = preferred[field]
    }
  }
  return merged
}

export const buildArtifactIndex = (groups = []) => {
  const byPath = new Map()

  for (const raw of flattenGroups(groups)) {
    if (!raw || typeof raw !== 'object') {
      continue
    }
    const path = normalizePath(raw.path || raw.name)
    if (!path) {
      continue
    }
    const candidate = { ...raw, path }
    const key = path.toLowerCase()
    const current = byPath.get(key)
    byPath.set(
      key,
      current ? mergeDuplicate(current, candidate) : candidate,
    )
  }

  return [...byPath.values()]
    .map(inferArtifactMeta)
    .sort((left, right) => mtimeValue(right) - mtimeValue(left))
}

const sameText = (left, right) =>
  String(left ?? '').toLowerCase() === String(right ?? '').toLowerCase()

export const filterArtifacts = (items = [], filters = {}) => {
  const classA = normalizeClassId(filters.classA)
  const classB = normalizeClassId(filters.classB)
  const hasClassA = hasValue(filters.classA) && classA !== null
  const hasClassB = hasValue(filters.classB) && classB !== null

  return items.filter((item) => {
    if (hasValue(filters.model) && !sameText(item.model, filters.model)) {
      return false
    }
    if (hasValue(filters.stage) && !sameText(item.stage, filters.stage)) {
      return false
    }
    if (hasValue(filters.kind) && !sameText(item.kind, filters.kind)) {
      return false
    }

    const itemClassA = normalizeClassId(item.classA)
    const itemClassB = normalizeClassId(item.classB)
    if (hasClassA && hasClassB) {
      const direct = itemClassA === classA && itemClassB === classB
      const reverse = itemClassA === classB && itemClassB === classA
      if (!direct && !reverse) {
        return false
      }
    } else if (
      hasClassA &&
      itemClassA !== classA &&
      itemClassB !== classA
    ) {
      return false
    } else if (
      hasClassB &&
      itemClassA !== classB &&
      itemClassB !== classB
    ) {
      return false
    }

    return true
  })
}

/** Directories to index for a research stage (keeps library loads small). */
export const STAGE_INDEX_DIRS = Object.freeze({
  subarch: Object.freeze(['results/similarSubArch']),
  causal: Object.freeze(['results/causal_intervention']),
  fuzzing: Object.freeze(['results/fuzzing']),
  guide: Object.freeze(['results/figures']),
  uncategorized: Object.freeze(['results']),
})

export const CASE_INDEX_DIRS = Object.freeze([
  'results/similarSubArch',
  'results/causal_intervention',
  'results/fuzzing',
  'results/figures',
])

const fileBasename = (item) =>
  basename(item?.path || item?.name || '').toLowerCase()

/**
 * Primary gallery images: the stage's main experiment pictures.
 * Subarch focuses on similar_subarch result PNGs, not masks / matrices / PDFs.
 */
export const isPrimaryResultImage = (item) => {
  if (!item || item.isPdf || item.isImage === false) return false
  if (!item.isImage && !IMAGE_EXTENSIONS.has(extension(item.path || item.name))) {
    return false
  }
  const name = fileBasename(item)
  if (!name || name.endsWith('.pdf')) return false

  const stage = item.stage
  if (stage === 'subarch') {
    // One primary card per class folder: similar_subarch.png
    // Variants like similar_subarch_119.png / _bac / _correct stay in「其它图片」.
    return item.kind === 'similar-subarch' && name === 'similar_subarch.png'
  }
  if (stage === 'causal') {
    return item.kind === 'heatmap' || /\d+[_-]vs[_-]\d+.*mask\.\d+\.png$/.test(name)
  }
  if (stage === 'fuzzing') {
    return (
      item.kind === 'comparison' ||
      name.includes('compare') ||
      name.includes('adversarial')
    )
  }
  return Boolean(item.isImage)
}

export const isLibraryImage = (item) =>
  Boolean(item) &&
  item.isPdf !== true &&
  item.isImage === true &&
  !String(item.path || item.name || '')
    .toLowerCase()
    .endsWith('.pdf')
