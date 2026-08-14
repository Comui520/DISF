import { describe, expect, it } from 'vitest'

import { demoArtifacts } from './demoArtifacts.js'

describe('demo artifact fixture', () => {
  it('marks the bundle and every preview surface as demo data', () => {
    expect(demoArtifacts.demo).toBe(true)
    expect(demoArtifacts.demoLabel).toBe('示例数据')
    expect(demoArtifacts.notice).toContain('不代表真实实验结论')

    expect(demoArtifacts.artifacts.length).toBeGreaterThan(0)
    expect(demoArtifacts.artifacts.every((item) => item.demo)).toBe(true)
    expect(
      demoArtifacts.artifacts.every(
        (item) =>
          item.path.startsWith('image/') ||
          (item.path.startsWith('demo/') &&
            String(item.previewPath || '').startsWith('image/')),
      ),
    ).toBe(true)
    expect(
      new Set(demoArtifacts.artifacts.map((item) => item.stage)),
    ).toEqual(new Set(['subarch', 'causal', 'fuzzing', 'guide']))

    for (const panel of ['image', 'insight', 'chart', 'params']) {
      expect(demoArtifacts.panels[panel]).toEqual(
        expect.objectContaining({
          demo: true,
          demoLabel: '示例数据',
        }),
      )
    }
  })

  it('contains safe preview metadata for matrix, diff-pair, and fuzzing views', () => {
    for (const key of ['matrix', 'diffPair', 'fuzzing']) {
      expect(demoArtifacts[key]).toEqual(
        expect.objectContaining({
          demo: true,
          demoLabel: '示例数据',
        }),
      )
    }

    expect(demoArtifacts.matrix.entries.length).toBeGreaterThan(0)
    expect(demoArtifacts.diffPair.classA).toBeTypeOf('number')
    expect(demoArtifacts.diffPair.classB).toBeTypeOf('number')
    expect(demoArtifacts.fuzzing.images.length).toBeGreaterThan(0)
  })
})
