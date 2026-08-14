import { describe, expect, it } from 'vitest'

import {
  ALL_TASK_TYPES,
  evidenceLocationFromTask,
  isSuccessfulTask,
  researchContextFromTask,
} from './taskFlow.js'

describe('taskFlow', () => {
  it('covers all six web-runnable task types', () => {
    expect([...ALL_TASK_TYPES].sort()).toEqual(
      [
        'nad_mask',
        'subarch_sim',
        'causal_pipeline',
        'causal_fuzz',
        'export_fuzz_images',
        'unsw_pipeline',
      ].sort(),
    )
  })

  it('maps a successful fuzzing task into an evidence deep link', () => {
    const task = {
      status: 'succeeded',
      task_type: 'causal_fuzz',
      params: {
        net: 'vgg16',
        class_a: 119,
        class_b: 332,
      },
    }

    expect(isSuccessfulTask(task)).toBe(true)
    expect(researchContextFromTask(task)).toEqual({
      model: 'vgg16',
      stage: 'fuzzing',
      classA: 119,
      classB: 332,
      panel: 'image',
    })
    expect(evidenceLocationFromTask(task)).toEqual({
      name: 'evidence',
      query: {
        model: 'vgg16',
        stage: 'fuzzing',
        classA: 119,
        classB: 332,
        panel: 'image',
      },
    })
  })
})
