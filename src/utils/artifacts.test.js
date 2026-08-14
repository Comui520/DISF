import { describe, expect, it } from 'vitest'

import {
  buildArtifactIndex,
  filterArtifacts,
  inferArtifactMeta,
  isLibraryImage,
  isPrimaryResultImage,
} from './artifacts.js'

const rawArtifact = (path, overrides = {}) => ({
  path,
  name: path.split('/').at(-1),
  mtime: 100,
  size: 2048,
  ...overrides,
})

describe('inferArtifactMeta', () => {
  it.each([
    [
      'image/vgg16_masks.png',
      {
        stage: 'subarch',
        model: 'vgg16',
        kind: 'mask',
        isImage: true,
        isPdf: false,
      },
    ],
    [
      'image/resnet50_masks.pdf',
      {
        stage: 'subarch',
        model: 'resnet50',
        kind: 'mask',
        isImage: false,
        isPdf: true,
      },
    ],
    [
      'image/disf_framework_3stage.png',
      {
        stage: 'guide',
        kind: 'framework',
        isImage: true,
        isPdf: false,
      },
    ],
    [
      'results/fuzzing/unsw_bilstm/compare.png',
      {
        stage: 'fuzzing',
        model: 'cnn_bilstm',
        kind: 'comparison',
        isImage: true,
        isPdf: false,
      },
    ],
    [
      'results/disf_unsw/summary.png',
      {
        model: 'cnn_bilstm',
        isImage: true,
        isPdf: false,
      },
    ],
  ])('recognizes repository artifact %s', (path, expected) => {
    const result = inferArtifactMeta(rawArtifact(path, { source: 'repository' }))

    expect(result).toEqual(expect.objectContaining(expected))
    expect(result.source).toBe('repository')
    expect(result.id).toBeTruthy()
    expect(result.title).toMatch(/[\u4e00-\u9fff]/)
    expect(result.description).toMatch(/[\u4e00-\u9fff]/)
  })

  it('recognizes similar-subarchitecture result paths', () => {
    const result = inferArtifactMeta(
      rawArtifact('results/similarSubArch/place/vgg16/class_119/overview.png'),
    )

    expect(result).toEqual(
      expect.objectContaining({
        stage: 'subarch',
        model: 'vgg16',
        classA: 119,
      }),
    )
  })

  it.each([
    ['119_vs_332', 119, 332],
    ['119_to_332', 119, 332],
  ])('extracts class pairs using %s syntax', (pair, classA, classB) => {
    const result = inferArtifactMeta(
      rawArtifact(
        `results/causal_intervention/place/vgg16/heatmaps/${pair}_mask.10.png`,
      ),
    )

    expect(result).toEqual(
      expect.objectContaining({
        stage: 'causal',
        model: 'vgg16',
        classA,
        classB,
        layer: 'mask.10',
        kind: 'heatmap',
      }),
    )
  })

  it('recognizes fuzzing comparison images', () => {
    const result = inferArtifactMeta(
      rawArtifact(
        'results/fuzzing/place/vgg16/run_01/119_vs_332_adversarial_compare.png',
      ),
    )

    expect(result).toEqual(
      expect.objectContaining({
        stage: 'fuzzing',
        model: 'vgg16',
        classA: 119,
        classB: 332,
        kind: 'comparison',
      }),
    )
  })

  it('recognizes paper figure paths under results/figures', () => {
    expect(
      inferArtifactMeta(
        rawArtifact('results/figures/channel_causal_119_vs_332_mask10.png'),
      ),
    ).toEqual(
      expect.objectContaining({
        stage: 'causal',
        classA: 119,
        classB: 332,
      }),
    )
    expect(
      inferArtifactMeta(rawArtifact('results/figures/similarity_distribution.png')),
    ).toEqual(expect.objectContaining({ stage: 'subarch' }))
  })

  it('falls back safely for an unknown image', () => {
    expect(() =>
      inferArtifactMeta(rawArtifact('uploads/misc/unrecognized-output.webp')),
    ).not.toThrow()

    expect(
      inferArtifactMeta(rawArtifact('uploads/misc/unrecognized-output.webp')),
    ).toEqual(
      expect.objectContaining({
        stage: 'uncategorized',
        kind: 'general',
        isImage: true,
        isPdf: false,
      }),
    )
  })

  it('reads class id from similarSubArch folders and marks primary result images', () => {
    const item = inferArtifactMeta(
      rawArtifact(
        'results/similarSubArch/place/vgg16/119/similar_subarch.png',
      ),
    )
    expect(item).toEqual(
      expect.objectContaining({
        stage: 'subarch',
        kind: 'similar-subarch',
        classA: 119,
        isImage: true,
      }),
    )
    expect(isPrimaryResultImage(item)).toBe(true)
    expect(
      isPrimaryResultImage(
        inferArtifactMeta(
          rawArtifact(
            'results/similarSubArch/place/vgg16/119/similar_subarch_119.png',
          ),
        ),
      ),
    ).toBe(false)
    expect(
      isPrimaryResultImage(
        inferArtifactMeta(
          rawArtifact(
            'results/similarSubArch/place/vgg16/119/classify_classes.png',
          ),
        ),
      ),
    ).toBe(false)
    expect(
      isLibraryImage(
        inferArtifactMeta(rawArtifact('results/foo/bar.pdf')),
      ),
    ).toBe(false)
  })
})

describe('buildArtifactIndex', () => {
  it('merges groups, deduplicates paths, and sorts newest first', () => {
    const result = buildArtifactIndex([
      [
        rawArtifact('results/shared.png', {
          mtime: 10,
          description: 'older description',
          source: 'results',
        }),
      ],
      [
        rawArtifact('results\\shared.png', {
          mtime: 20,
          title: 'newer title',
          source: 'image',
        }),
        rawArtifact('results/newest.png', { mtime: 30 }),
      ],
    ])

    expect(result.map(({ path }) => path)).toEqual([
      'results/newest.png',
      'results/shared.png',
    ])
    expect(result[1]).toEqual(
      expect.objectContaining({
        mtime: 20,
        title: 'newer title',
        description: 'older description',
        source: 'image',
      }),
    )
  })

  it('keeps size and mtime from the same newest record', () => {
    const [result] = buildArtifactIndex([
      [
        rawArtifact('results/shared.png', {
          mtime: 100,
          size: 10,
          title: 'semantic title',
          description: 'semantic description',
          model: 'vgg16',
        }),
      ],
      [
        rawArtifact('results/shared.png', {
          mtime: 200,
          size: 20,
          title: undefined,
          description: undefined,
          model: undefined,
        }),
      ],
    ])

    expect(result).toEqual(
      expect.objectContaining({
        mtime: 200,
        size: 20,
        title: 'semantic title',
        description: 'semantic description',
        model: 'vgg16',
      }),
    )
  })
})

describe('filterArtifacts', () => {
  const items = [
    inferArtifactMeta(
      rawArtifact(
        'results/causal_intervention/place/vgg16/heatmaps/119_vs_332_mask.10.png',
      ),
    ),
    inferArtifactMeta(
      rawArtifact(
        'results/fuzzing/place/resnet50/run/4_to_8_adversarial_compare.png',
      ),
    ),
  ]

  it('filters by model, stage, and kind', () => {
    expect(
      filterArtifacts(items, {
        model: 'vgg16',
        stage: 'causal',
        kind: 'heatmap',
      }),
    ).toEqual([items[0]])
  })

  it('matches a class pair regardless of pair order', () => {
    expect(filterArtifacts(items, { classA: 332, classB: 119 })).toEqual([
      items[0],
    ])
  })
})
