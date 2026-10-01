// Numbers shown on the Weight screen, kept free of React so they're easy to test.

import type { WeightEntry } from '../../data/db'

export type Range = '7d' | '30d' | '90d' | 'all'

const DAY = 24 * 60 * 60 * 1000
const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 }

// Entries inside the range, oldest first (for charts).
export function inRange(entries: WeightEntry[], range: Range, now: Date): WeightEntry[] {
  const sorted = [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
  if (range === 'all') return sorted
  const from = now.getTime() - RANGE_DAYS[range] * DAY
  return sorted.filter((entry) => new Date(entry.recordedAt).getTime() >= from)
}

// Latest weight minus the latest weight from at least a week before it; null if there's none.
export function weeklyChange(entries: WeightEntry[]): number | null {
  const sorted = [...entries].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  const latest = sorted[0]
  if (!latest) return null
  const cutoff = new Date(latest.recordedAt).getTime() - 7 * DAY
  const before = sorted.find((entry) => new Date(entry.recordedAt).getTime() <= cutoff)
  return before ? round1(latest.weightKg - before.weightKg) : null
}

// How far from the starting weight towards the target (0–1). Null without a target or progress.
export function targetProgress(entries: WeightEntry[], targetKg: number | null): number | null {
  if (targetKg == null || entries.length === 0) return null
  const sorted = [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
  const start = sorted[0]!.weightKg
  const current = sorted.at(-1)!.weightKg
  if (start === targetKg) return current === targetKg ? 1 : 0
  const progress = (start - current) / (start - targetKg)
  return Math.max(0, Math.min(1, progress))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
