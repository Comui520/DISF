import { describe, expect, it } from 'vitest'

import {
  ARTIFACT_KIND_DEFINITIONS,
  LIBRARY_AUX_SECTIONS,
  RESEARCH_PANELS,
  RESEARCH_STAGES,
} from './research.js'

describe('research constants', () => {
  it('keeps only the three DISF research stages in the spine', () => {
    expect(RESEARCH_STAGES.map(({ key, order }) => ({ key, order }))).toEqual([
      { key: 'subarch', order: 1 },
      { key: 'causal', order: 2 },
      { key: 'fuzzing', order: 3 },
    ])

    for (const stage of RESEARCH_STAGES) {
      expect(stage.name).toMatch(/[\u4e00-\u9fff]/)
      expect(stage.description.length).toBeGreaterThan(4)
    }

    expect(LIBRARY_AUX_SECTIONS.map(({ key }) => key)).toEqual([
      'guide',
      'uncategorized',
    ])
  })

  it('defines all supported panels and readable artifact copy', () => {
    expect(RESEARCH_PANELS.map(({ key }) => key)).toEqual([
      'image',
      'insight',
      'chart',
      'params',
    ])

    for (const definition of Object.values(ARTIFACT_KIND_DEFINITIONS)) {
      expect(definition.title).toMatch(/[\u4e00-\u9fff]/)
      expect(definition.description({ model: 'vgg16' })).toMatch(/[\u4e00-\u9fff]/)
    }
  })
})
