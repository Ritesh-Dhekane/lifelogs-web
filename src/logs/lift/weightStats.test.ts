import { describe, expect, it } from 'vitest'

import type { WeightEntry } from '../../data/db'
import { inRange, targetProgress, weeklyChange } from './weightStats'

function entry(recordedAt: string, weightKg: number): WeightEntry {
  return {
    id: recordedAt,
    recordedAt,
    kind: 'general',
    weightKg,
    note: null,
    createdAt: recordedAt,
    updatedAt: recordedAt,
    deletedAt: null,
  }
}

const NOW = new Date('2026-10-01T12:00:00Z')
const ENTRIES = [
  entry('2026-06-01T07:00:00Z', 78),
  entry('2026-09-10T07:00:00Z', 75),
  entry('2026-09-23T07:00:00Z', 74.2),
  entry('2026-09-28T07:00:00Z', 73.9),
  entry('2026-10-01T07:00:00Z', 73.4),
]

describe('inRange', () => {
  it('keeps entries inside the window, oldest first', () => {
    expect(inRange(ENTRIES, '7d', NOW).map((e) => e.weightKg)).toEqual([73.9, 73.4])
    expect(inRange(ENTRIES, '30d', NOW)).toHaveLength(4)
    expect(inRange(ENTRIES, 'all', NOW)[0]?.weightKg).toBe(78)
  })
})

describe('weeklyChange', () => {
  it('compares the latest weight with the last one at least a week earlier', () => {
    expect(weeklyChange(ENTRIES)).toBe(-0.8) // 73.4 vs 74.2 (Sep 23)
  })

  it('is null without a week of history', () => {
    expect(weeklyChange(ENTRIES.slice(3))).toBeNull()
    expect(weeklyChange([])).toBeNull()
  })
})

describe('targetProgress', () => {
  it('measures progress from the first entry towards the target', () => {
    expect(targetProgress(ENTRIES, 72)).toBeCloseTo((78 - 73.4) / (78 - 72))
    expect(targetProgress(ENTRIES, null)).toBeNull()
  })

  it('works for gaining too, and stays within 0–1', () => {
    const gaining = [entry('2026-09-01T07:00:00Z', 60), entry('2026-10-01T07:00:00Z', 63)]
    expect(targetProgress(gaining, 66)).toBeCloseTo(0.5)
    expect(targetProgress(gaining, 62)).toBe(1)
    expect(
      targetProgress([entry('2026-09-01T07:00:00Z', 60), entry('2026-10-01T07:00:00Z', 58)], 66),
    ).toBe(0)
  })
})
