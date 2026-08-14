import { describe, expect, it } from 'vitest'

import {
  adjacentStages,
  collectModels,
  collectPairs,
  filterLibraryArtifacts,
  findArtifact,
  findStagePeer,
  listRelatedArtifacts,
  workspaceLocation,
} from './workspace.js'

const items = [
  {
    id: 'a',
    path: 'results/causal_intervention/place/vgg16/heatmaps/119_vs_332_heatmap.png',
    model: 'vgg16',
    stage: 'causal',
    classA: 119,
    classB: 332,
    layer: 'mask.10',
    kind: 'heatmap',
    isImage: true,
  },
  {
    id: 'b',
    path: 'results/fuzzing/place/vgg16/images/119_vs_332/119_vs_332_compare.png',
    model: 'vgg16',
    stage: 'fuzzing',
    classA: 332,
    classB: 119,
    kind: 'comparison',
    isImage: true,
  },
  {
    id: 'sibling',
    path: 'results/causal_intervention/place/vgg16/heatmaps/119_vs_332_mask.10.png',
    model: 'vgg16',
    stage: 'causal',
    classA: 119,
    classB: 332,
    kind: 'heatmap',
    isImage: true,
  },
  {
    id: 'subarch',
    path: 'results/similarSubArch/place/vgg16/119/similar_subarch.png',
    model: 'vgg16',
    stage: 'subarch',
    classA: 119,
    kind: 'similar-subarch',
    isImage: true,
  },
  {
    id: 'c',
    path: 'image/vgg16_masks.png',
    model: 'vgg16',
    stage: 'subarch',
    kind: 'mask',
    isImage: true,
  },
  {
    id: 'd',
    path: 'image/resnet50_masks.pdf',
    model: 'resnet50',
    stage: 'subarch',
    kind: 'mask',
    isPdf: true,
    isImage: false,
  },
]

describe('workspace helpers', () => {
  it('finds artifacts by id, path, or name', () => {
    expect(findArtifact(items, 'a')?.path).toContain('heatmap')
    expect(findArtifact(items, items[1].path)?.id).toBe('b')
    expect(findArtifact(items, 'missing')).toBeNull()
  })

  it('lists related artifacts by shared folder or class pair, not model-only files', () => {
    const related = listRelatedArtifacts(
      [
        ...items,
        {
          id: 'other-pair',
          path: 'results/causal_intervention/place/vgg16/heatmaps/extra/119_vs_500_heatmap.png',
          model: 'vgg16',
          stage: 'causal',
          classA: 119,
          classB: 500,
          kind: 'heatmap',
          isImage: true,
        },
      ],
      items[0],
      { limit: 8 },
    )
    expect(related.map((item) => item.id)).toEqual(['sibling', 'b', 'subarch'])
  })

  it('finds a peer artifact when moving across research stages', () => {
    expect(
      findStagePeer(items, {
        stage: 'fuzzing',
        model: 'vgg16',
        classA: 119,
        classB: 332,
        from: items[0],
      })?.id,
    ).toBe('b')
    expect(
      findStagePeer(items, {
        stage: 'subarch',
        model: 'vgg16',
        classA: 119,
        classB: 332,
        from: items[0],
      })?.id,
    ).toBe('subarch')
    expect(
      findStagePeer(items, {
        stage: 'causal',
        model: 'missing',
        from: items[5],
      }),
    ).toBeNull()
  })

  it('returns adjacent research stages', () => {
    expect(adjacentStages('causal')).toEqual({
      previous: expect.objectContaining({ key: 'subarch' }),
      next: expect.objectContaining({ key: 'fuzzing' }),
    })
    expect(adjacentStages('unknown')).toEqual({ previous: null, next: null })
  })

  it('collects filter options and filters library items', () => {
    expect(collectModels(items)).toEqual(['resnet50', 'vgg16'])
    expect(collectPairs(items)).toEqual([
      { classA: 119, classB: 332, label: '119 ↔ 332' },
    ])
    expect(
      collectPairs(items, { formatClass: (id) => (id === 119 ? '119 diner' : String(id)) }),
    ).toEqual([{ classA: 119, classB: 332, label: '119 diner ↔ 332' }])
    expect(
      filterLibraryArtifacts(
        [
          ...items,
          {
            id: 'heat-img',
            path: 'results/causal/119_vs_332_heatmap.png',
            model: 'vgg16',
            stage: 'causal',
            classA: 119,
            classB: 332,
            kind: 'heatmap',
            isImage: true,
          },
        ],
        {
          model: 'vgg16',
          stage: 'causal',
          classA: 119,
          classB: 332,
        },
      ).map((item) => item.id),
    ).toEqual(['a', 'sibling', 'heat-img'])
    expect(
      filterLibraryArtifacts(items, {
        stage: 'uncategorized',
      }).map((item) => item.id),
    ).toEqual([])
  })

  it('builds deep-linkable workspace locations', () => {
    expect(
      workspaceLocation('case', {
        model: 'vgg16',
        stage: 'causal',
        classA: 119,
        classB: 332,
        artifact: 'results/causal/119_vs_332_heatmap.png',
        panel: 'insight',
      }),
    ).toEqual({
      name: 'case',
      query: {
        model: 'vgg16',
        stage: 'causal',
        classA: 119,
        classB: 332,
        artifact: 'results/causal/119_vs_332_heatmap.png',
        panel: 'insight',
      },
    })
  })
})
