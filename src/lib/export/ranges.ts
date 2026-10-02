// Date-range presets for the export page.

import { toDay } from '../days'
import type { ExportRange } from './datasets'

export type RangePreset = 'all' | 'this-month' | 'last-month' | 'this-year' | 'custom'

export const RANGE_LABEL: Record<RangePreset, string> = {
  all: 'All time',
  'this-month': 'This month',
  'last-month': 'Last month',
  'this-year': 'This year',
  custom: 'Custom',
}

export function presetRange(preset: RangePreset, now: Date, custom: ExportRange): ExportRange {
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (preset) {
    case 'all':
      return { from: null, to: null }
    case 'this-month':
      return { from: toDay(new Date(y, m, 1)), to: toDay(now) }
    case 'last-month':
      return { from: toDay(new Date(y, m - 1, 1)), to: toDay(new Date(y, m, 0)) }
    case 'this-year':
      return { from: toDay(new Date(y, 0, 1)), to: toDay(now) }
    case 'custom':
      // An empty end means "until today"; dates entered the wrong way round are swapped.
      if (custom.from && custom.to && custom.from > custom.to)
        return { from: custom.to, to: custom.from }
      return custom
  }
}

export function exportFileName(kind: string, ext: 'xlsx' | 'csv', now: Date): string {
  return `lifelogs-${kind}-${toDay(now)}.${ext}`
}
