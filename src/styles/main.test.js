import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const css = fs.readFileSync(
  fileURLToPath(new URL('./main.css', import.meta.url)),
  'utf8',
)

const token = (name) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))
  if (!match) throw new Error(`Missing opaque color token --${name}`)
  return match[1]
}

const relativeLuminance = (hex) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4,
    )
  return (
    channels[0] * 0.2126 +
    channels[1] * 0.7152 +
    channels[2] * 0.0722
  )
}

const contrast = (left, right) => {
  const values = [relativeLuminance(left), relativeLuminance(right)].sort(
    (a, b) => b - a,
  )
  return (values[0] + 0.05) / (values[1] + 0.05)
}

describe('global accessibility tokens', () => {
  it('keeps definite and minimum full-height roots for existing layouts', () => {
    const htmlRule = css.match(/html\s*\{([^}]*)\}/)?.[1] || ''
    const appRule = css.match(/body,\s*#app\s*\{([^}]*)\}/)?.[1] || ''

    for (const rule of [htmlRule, appRule]) {
      expect(rule).toMatch(/height:\s*100%/)
      expect(rule).toMatch(/min-height:\s*100%/)
    }
  })

  it('uses opaque focus colors with contrast on light and dark surfaces', () => {
    const focusRing = token('color-focus-ring')
    const focusHalo = token('color-focus-halo')

    expect(contrast(focusRing, token('color-surface-warm'))).toBeGreaterThanOrEqual(
      3,
    )
    expect(contrast(focusHalo, token('color-frame'))).toBeGreaterThanOrEqual(3)
    expect(css.match(/:focus-visible\s*\{([^}]*)\}/)?.[1]).not.toContain('rgba(')
  })

  it('keeps placeholder text at 4.5:1 and fully opaque', () => {
    expect(
      contrast(token('color-placeholder'), token('color-surface-warm')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(
      /::placeholder\s*\{[^}]*color:\s*var\(--color-placeholder\)[^}]*opacity:\s*1/,
    )
  })
})
