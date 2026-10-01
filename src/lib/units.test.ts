import { describe, expect, it } from 'vitest'

import { formatMass, formatTonnage, formatWeight, fromKg, toKg } from './units'

describe('units', () => {
  it('round-trips kg and lb', () => {
    expect(fromKg(100, 'lb')).toBeCloseTo(220.462, 2)
    expect(toKg(220.462, 'lb')).toBeCloseTo(100, 2)
    expect(toKg(73.4, 'kg')).toBe(73.4)
  })

  it('formats for display', () => {
    expect(formatWeight(73.4, 'kg')).toBe('73.4 kg')
    expect(formatWeight(73, 'kg')).toBe('73.0 kg')
    expect(formatWeight(73.4, 'lb')).toBe('161.8 lb')
    expect(formatWeight(73.4, 'kg', { unitLabel: false })).toBe('73.4')
    expect(formatMass(4820.4, 'kg')).toBe('4,820 kg')
    expect(formatTonnage(68420, 'kg')).toBe('68.4t')
    expect(formatTonnage(4820, 'kg')).toBe('4,820 kg')
  })
})
