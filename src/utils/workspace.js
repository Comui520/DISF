import { RESEARCH_STAGE_KEYS, RESEARCH_STAGES } from '../constants/research.js'
import {
  filterArtifacts,
  isLibraryImage,
  isPrimaryResultImage,
} from './artifacts.js'

const normalizeRef = (value) =>
  String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .trim()
    .toLowerCase()

const parentDir = (path) => {
  const value = normalizeRef(path)
  const index = value.lastIndexOf('/')
  return index >= 0 ? value.slice(0, index) : ''
}

const sameFolder = (left, right) => {
  const folder = parentDir(left?.path || left?.id)
  return Boolean(folder && folder === parentDir(right?.path || right?.id))
}

const samePair = (left, right) => {
  const leftA = left?.classA
  const leftB = left?.classB
  const rightA = right?.classA
  const rightB = right?.classB
  if (
    !Number.isFinite(leftA) ||
    !Number.isFinite(leftB) ||
    !Number.isFinite(rightA) ||
    !Number.isFinite(rightB)
  ) {
    return false
  }
  return (
    (leftA === rightA && leftB === rightB) ||
    (leftA === rightB && leftB === rightA)
  )
}

const hasPair = (item) =>
  Number.isFinite(item?.classA) && Number.isFinite(item?.classB)

const classTouch = (item, current) => {
  const currentIds = [current?.classA, current?.classB].filter((value) =>
    Number.isFinite(value),
  )
  if (!currentIds.length) return false
  return (
    (Number.isFinite(item?.classA) && currentIds.includes(item.classA)) ||
    (Number.isFinite(item?.classB) && currentIds.includes(item.classB))
  )
}

const sameCase = (item, current) => {
  if (sameFolder(item, current) || samePair(item, current)) return true
  // Single-class artifacts (e.g. similar_subarch/119) can join a pair case.
  // Two complete pairs that only share one class are different cases.
  if (!hasPair(item) || !hasPair(current)) {
    return classTouch(item, current)
  }
  return false
}

const artifactScore = (item, current) => {
  const sibling = sameFolder(item, current)
  const pairMatch = samePair(item, current)
  const touchesClass = classTouch(item, current)
  if (!sameCase(item, current)) {
    return 0
  }

  const modelMatch =
    Boolean(item.model) &&
    Boolean(current.model) &&
    item.model === current.model

  let score = 0
  if (sibling) score += 12
  if (pairMatch) score += 10
  if (touchesClass) score += 4
  if (modelMatch) score += 2
  if (item.stage && current.stage && item.stage === current.stage) score += 1
  if (item.layer && current.layer && item.layer === current.layer) score += 2
  if (item.kind && current.kind && item.kind !== current.kind) score += 1
  if (item.isImage) score += 1
  return score
}

export const findArtifact = (items = [], artifactRef) => {
  const needle = normalizeRef(artifactRef)
  if (!needle) return null
  return (
    items.find((item) => {
      if (!item) return false
      if (normalizeRef(item.id) === needle) return true
      if (normalizeRef(item.path) === needle) return true
      if (normalizeRef(item.name) === needle) return true
      return false
    }) || null
  )
}

export const listRelatedArtifacts = (
  items = [],
  current,
  { limit = 8 } = {},
) => {
  if (!current) return []
  const currentKey = normalizeRef(current.id || current.path)
  return items
    .filter((item) => {
      if (!item || !isLibraryImage(item)) return false
      const key = normalizeRef(item.id || item.path)
      if (!key || key === currentKey) return false
      return artifactScore(item, current) > 0
    })
    .sort((left, right) => {
      const scoreDelta = artifactScore(right, current) - artifactScore(left, current)
      if (scoreDelta) return scoreDelta
      if (isPrimaryResultImage(right) !== isPrimaryResultImage(left)) {
        return isPrimaryResultImage(right) ? 1 : -1
      }
      return 0
    })
    .slice(0, Math.max(0, limit))
}

/**
 * Find the best evidence in another research stage that continues the same case.
 * Prefer shared class pair, then same model, then any item in that stage.
 */
export const findStagePeer = (
  items = [],
  { stage, model, classA, classB, from } = {},
) => {
  if (!stage) return null
  const currentKey = normalizeRef(from?.id || from?.path)
  const pool = items.filter((item) => {
    if (!item || item.stage !== stage) return false
    const key = normalizeRef(item.id || item.path)
    return key && key !== currentKey
  })
  if (!pool.length) return null

  const seed = {
    model: model || from?.model || null,
    classA: Number.isFinite(classA) ? classA : from?.classA,
    classB: Number.isFinite(classB) ? classB : from?.classB,
    stage,
    layer: from?.layer,
    kind: from?.kind,
  }

  const ranked = [...pool].sort((left, right) => {
    const scoreDelta = artifactScore(right, seed) - artifactScore(left, seed)
    if (scoreDelta) return scoreDelta
    if (isPrimaryResultImage(right) !== isPrimaryResultImage(left)) {
      return isPrimaryResultImage(right) ? 1 : -1
    }
    if (Boolean(right.isImage) !== Boolean(left.isImage)) {
      return left.isImage ? -1 : 1
    }
    return 0
  })

  const withContext = ranked.find((item) => artifactScore(item, seed) > 0)
  if (withContext) return withContext

  const hasContext =
    Boolean(seed.model) ||
    Number.isFinite(seed.classA) ||
    Number.isFinite(seed.classB)
  if (hasContext) return null

  return ranked.find((item) => item.isImage) || ranked[0] || null
}

export const adjacentStages = (stage) => {
  const index = RESEARCH_STAGE_KEYS.indexOf(stage)
  if (index < 0) {
    return { previous: null, next: null }
  }
  return {
    previous: RESEARCH_STAGES[index - 1] || null,
    next: RESEARCH_STAGES[index + 1] || null,
  }
}

export const collectModels = (items = []) => {
  const models = new Set()
  for (const item of items) {
    if (item?.model) models.add(String(item.model))
  }
  return [...models].sort((left, right) => left.localeCompare(right))
}

export const collectPairs = (items = [], { formatClass } = {}) => {
  const pairs = new Map()
  const labelFor = (id) =>
    typeof formatClass === 'function' ? formatClass(id) || String(id) : String(id)
  for (const item of items) {
    if (!Number.isFinite(item?.classA) || !Number.isFinite(item?.classB)) {
      continue
    }
    const [classA, classB] =
      item.classA <= item.classB
        ? [item.classA, item.classB]
        : [item.classB, item.classA]
    const key = `${classA}:${classB}`
    if (!pairs.has(key)) {
      pairs.set(key, {
        classA,
        classB,
        label: `${labelFor(classA)} ↔ ${labelFor(classB)}`,
      })
    }
  }
  return [...pairs.values()].sort(
    (left, right) => left.classA - right.classA || left.classB - right.classB,
  )
}

export const filterLibraryArtifacts = (
  items = [],
  context = {},
  { lane = 'primary' } = {},
) => {
  const scoped = filterArtifacts(items, {
    model: context.model,
    stage: context.stage,
    classA: context.classA,
    classB: context.classB,
  }).filter(isLibraryImage)

  if (lane === 'all') {
    return scoped
  }
  if (lane === 'secondary') {
    return scoped.filter((item) => !isPrimaryResultImage(item))
  }
  return scoped.filter(isPrimaryResultImage)
}

export const workspaceLocation = (name, context = {}, extraQuery = {}) => {
  const query = { ...extraQuery }
  if (context.model) query.model = context.model
  if (context.stage) query.stage = context.stage
  if (Number.isFinite(context.classA)) query.classA = context.classA
  if (Number.isFinite(context.classB)) query.classB = context.classB
  if (context.artifact) query.artifact = context.artifact
  if (context.panel) query.panel = context.panel
  return { name, query }
}
