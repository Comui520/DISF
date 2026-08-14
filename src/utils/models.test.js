import { describe, expect, it } from 'vitest'

import {
  FALLBACK_REGISTERED_MODELS,
  mergeModelOptions,
  modelOptionLabel,
} from './models.js'

describe('registered model options', () => {
  it('labels models with display name and dataset', () => {
    expect(modelOptionLabel({ name: 'CNN-BiLSTM', net: 'cnn_bilstm', dataset: 'unsw' })).toBe(
      'CNN-BiLSTM · UNSW',
    )
    expect(modelOptionLabel({ name: 'VGG16', net: 'vgg16', dataset: 'place' })).toBe(
      'VGG16 · Places',
    )
  })

  it('keeps config models first and appends unknown artifact nets', () => {
    expect(
      mergeModelOptions(FALLBACK_REGISTERED_MODELS, ['vgg16', 'mystery_net']),
    ).toEqual([
      {
        net: 'vgg16',
        name: 'VGG16',
        dataset: 'place',
        label: 'VGG16 · Places',
      },
      {
        net: 'resnet50',
        name: 'ResNet50',
        dataset: 'place',
        label: 'ResNet50 · Places',
      },
      {
        net: 'cnn_bilstm',
        name: 'CNN-BiLSTM',
        dataset: 'unsw',
        label: 'CNN-BiLSTM · UNSW',
      },
      {
        net: 'mystery_net',
        name: 'mystery_net',
        dataset: '',
        label: 'mystery_net',
      },
    ])
  })
})
