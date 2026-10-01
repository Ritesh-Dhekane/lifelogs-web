// Weight is stored in kg; these convert for display and input in the user's unit (Settings).

import type { WeightUnit } from './prefs'

export const KG_PER_LB = 0.45359237

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB
}

// Round to 0.1 for display; trailing ".0" dropped only when asked.
export function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function formatWeight(kg: number, unit: WeightUnit, options: { unitLabel?: boolean } = {}) {
  const value = round1(fromKg(kg, unit)).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return options.unitLabel === false ? value : `${value} ${unit}`
}

// Big totals (volume lifted) without decimals: "4,820 kg".
export function formatMass(kg: number, unit: WeightUnit): string {
  return `${Math.round(fromKg(kg, unit)).toLocaleString('en-US')} ${unit}`
}

// "12.4t" style for very large volumes (tonnes, or thousands of lb).
export function formatTonnage(kg: number, unit: WeightUnit): string {
  const value = fromKg(kg, unit)
  return value >= 10_000
    ? `${(value / 1000).toFixed(1)}${unit === 'kg' ? 't' : 'k lb'}`
    : formatMass(kg, unit)
}

// Short label for chart bars: "7.0t" / "850 kg" (or "7.0k" / "850 lb").
export function formatShortMass(kg: number, unit: WeightUnit): string {
  const value = fromKg(kg, unit)
  if (value < 1000) return `${Math.round(value)} ${unit}`
  return `${(value / 1000).toFixed(1)}${unit === 'kg' ? 't' : 'k'}`
}
