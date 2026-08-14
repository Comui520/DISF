import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  LIBRARY_STAGE_KEYS,
  RESEARCH_PANEL_KEYS,
} from '../constants/research.js'

export const DEFAULT_RESEARCH_CONTEXT = Object.freeze({
  model: null,
  stage: 'subarch',
  classA: null,
  classB: null,
  artifact: null,
  panel: 'image',
})

const RESEARCH_QUERY_FIELDS = Object.freeze([
  'model',
  'stage',
  'classA',
  'classB',
  'artifact',
  'panel',
])

const firstQueryValue = (value) => (Array.isArray(value) ? value[0] : value)

const normalizedText = (value) => {
  const first = firstQueryValue(value)
  if (first === undefined || first === null) {
    return null
  }
  const text = String(first).trim()
  return text || null
}

const normalizedClassId = (value) => {
  const first = firstQueryValue(value)
  if (typeof first === 'number') {
    return Number.isSafeInteger(first) ? first : null
  }
  const text = normalizedText(first)
  if (!text || !/^-?\d+$/.test(text)) {
    return null
  }
  const number = Number(text)
  return Number.isSafeInteger(number) ? number : null
}

const normalizedChoice = (value, allowed, fallback) => {
  const text = normalizedText(value)
  return text && allowed.includes(text) ? text : fallback
}

export const parseResearchQuery = (query = {}) => {
  const modelText = normalizedText(query.model)
  return {
    model: modelText === 'all' ? null : modelText,
    stage: normalizedChoice(
      query.stage,
      LIBRARY_STAGE_KEYS,
      DEFAULT_RESEARCH_CONTEXT.stage,
    ),
    classA: normalizedClassId(query.classA),
    classB: normalizedClassId(query.classB),
    artifact: normalizedText(query.artifact),
    panel: normalizedChoice(
      query.panel,
      RESEARCH_PANEL_KEYS,
      DEFAULT_RESEARCH_CONTEXT.panel,
    ),
  }
}

export const toResearchQuery = (context = {}, baseQuery = {}) => {
  const query = { ...baseQuery }
  const values = {
    model: normalizedText(context.model),
    stage:
      normalizedText(context.stage) === null
        ? null
        : normalizedChoice(
            context.stage,
            LIBRARY_STAGE_KEYS,
            DEFAULT_RESEARCH_CONTEXT.stage,
          ),
    classA: normalizedClassId(context.classA),
    classB: normalizedClassId(context.classB),
    artifact: normalizedText(context.artifact),
    panel:
      normalizedText(context.panel) === null
        ? null
        : normalizedChoice(
            context.panel,
            RESEARCH_PANEL_KEYS,
            DEFAULT_RESEARCH_CONTEXT.panel,
          ),
  }

  for (const field of RESEARCH_QUERY_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(context, field)) {
      continue
    }
    const value = values[field]
    if (value === null) {
      delete query[field]
    } else {
      query[field] = value
    }
  }

  return query
}

export const useResearchContext = () => {
  const route = useRoute()
  const router = useRouter()
  const context = computed(() => parseResearchQuery(route.query))

  const updateContext = (patch = {}, { replace = false } = {}) => {
    const query = toResearchQuery(patch, route.query)
    return replace ? router.replace({ query }) : router.push({ query })
  }

  return {
    context,
    updateContext,
  }
}
