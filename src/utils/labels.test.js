import { describe, expect, it } from 'vitest'

import {
  buildLabelMap,
  formatClassId,
  formatClassPair,
} from './labels.js'

describe('class labels', () => {
  const labels = buildLabelMap([
    { id: 119, name: 'diner_outdoor' },
    { id: '332', name: 'ticket_booth' },
    { id: 7, name: '' },
  ])

  it('indexes numeric class ids and skips empty names', () => {
    expect(labels.get(119)).toBe('diner_outdoor')
    expect(labels.get(332)).toBe('ticket_booth')
    expect(labels.has(7)).toBe(false)
  })

  it('formats ids with names when available', () => {
    expect(formatClassId(119, labels)).toBe('119 diner_outdoor')
    expect(formatClassId(8, labels)).toBe('8')
    expect(formatClassPair(119, 332, labels)).toBe(
      '119 diner_outdoor ↔ 332 ticket_booth',
    )
    expect(formatClassPair(119, null, labels)).toBe('119 diner_outdoor')
  })
})
