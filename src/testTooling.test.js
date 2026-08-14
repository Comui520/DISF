import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const vitestPackagePath = require.resolve('vitest/package.json')
const vitestPackage = require(vitestPackagePath)
const projectVitePackage = require('vite/package.json')
const requireFromVitest = createRequire(vitestPackagePath)
const vitestVitePackage = requireFromVitest('vite/package.json')

const major = (version) => Number(String(version).split('.')[0])

describe('test tooling compatibility', () => {
  it('keeps Vitest on the Node 18 compatible 3.x line', () => {
    expect(major(vitestPackage.version)).toBe(3)
  })

  it('keeps production and Vitest-resolved Vite on major 5', () => {
    expect(major(projectVitePackage.version)).toBe(5)
    expect(major(vitestVitePackage.version)).toBe(5)
  })
})
