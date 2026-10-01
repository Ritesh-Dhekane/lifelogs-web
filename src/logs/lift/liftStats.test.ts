import { describe, expect, it } from 'vitest'

import type { Exercise, MuscleGroup, WorkoutSet } from '../../data/db'
import type { WorkoutDetail } from '../../data/workouts'
import {
  change,
  estimatedOneRepMax,
  muscleBalance,
  periodStats,
  personalRecords,
  volumeBars,
  weekStreaks,
} from './liftStats'

let counter = 0
function workout(
  startedAt: string,
  items: { id: string; muscle: MuscleGroup; sets: [number, number, boolean?][] }[],
): WorkoutDetail {
  const id = `w${++counter}`
  return {
    workout: {
      id,
      name: null,
      startedAt,
      endedAt: startedAt,
      pausedMs: 0,
      pausedAt: null,
      note: null,
      createdAt: startedAt,
      updatedAt: startedAt,
      deletedAt: null,
    },
    exercises: items.map((item, position) => {
      const exercise: Exercise = {
        id: item.id,
        name: item.id,
        muscle: item.muscle,
        equipment: 'barbell',
        isCustom: false,
        createdAt: '',
      }
      const sets: WorkoutSet[] = item.sets.map(([kg, reps, done = true], i) => ({
        id: `${id}-${item.id}-${i}`,
        workoutId: id,
        workoutExerciseId: `${id}-${item.id}`,
        position: i,
        reps,
        weightKg: kg,
        done,
        createdAt: '',
        updatedAt: '',
      }))
      return {
        entry: { id: `${id}-${item.id}`, workoutId: id, exerciseId: item.id, position, note: null },
        exercise,
        sets,
      }
    }),
  }
}

const NOW = new Date(2026, 9, 1, 12) // Thu Oct 1, 2026 (local time)
const at = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 864e5).toISOString()

const BENCH = (sets: [number, number, boolean?][]) => ({
  id: 'bench',
  muscle: 'chest' as const,
  sets,
})
const ROW = (sets: [number, number, boolean?][]) => ({ id: 'row', muscle: 'back' as const, sets })

const WORKOUTS = [
  workout(at(1), [
    BENCH([
      [80, 8],
      [85, 6],
    ]),
    ROW([[60, 10]]),
  ]),
  workout(at(10), [
    BENCH([
      [80, 8],
      [90, 1],
      [70, 10, false],
    ]),
  ]),
  workout(at(40), [
    ROW([
      [55, 10],
      [55, 10],
    ]),
  ]),
]

describe('periodStats', () => {
  it('totals the range and the same-length period before it', () => {
    const stats = periodStats(WORKOUTS, '30d', NOW)
    expect(stats.current).toEqual({ sessions: 2, sets: 5, volumeKg: 640 + 510 + 600 + 640 + 90 })
    expect(stats.previous).toEqual({ sessions: 1, sets: 2, volumeKg: 1100 })
    expect(change(stats.current.volumeKg, stats.previous!.volumeKg)).toBeCloseTo(2480 / 1100 - 1)
    expect(change(5, 0)).toBeNull()
  })

  it('covers everything for "all"', () => {
    const stats = periodStats(WORKOUTS, 'all', NOW)
    expect(stats.current.sessions).toBe(3)
    expect(stats.previous).toBeNull()
    expect(stats.days).toBe(40)
  })
})

describe('weekStreaks', () => {
  it('counts consecutive training weeks, allowing this week to be empty so far', () => {
    const weekly = [0, 7, 14, 28, 35, 42, 49].map((d) => workout(at(d + 1), [BENCH([[60, 5]])]))
    expect(weekStreaks(weekly, NOW, 'monday')).toEqual({ current: 3, best: 4 })
    expect(weekStreaks([], NOW, 'monday')).toEqual({ current: 0, best: 0 })
  })
})

describe('volumeBars', () => {
  it('uses days for 7D and weeks otherwise', () => {
    const days = volumeBars(WORKOUTS, '7d', NOW, 'monday')
    expect(days).toHaveLength(7)
    expect(days.at(-2)?.volumeKg).toBe(640 + 510 + 600)
    const weeks = volumeBars(WORKOUTS, '30d', NOW, 'monday')
    expect(weeks).toHaveLength(5)
    expect(weeks.reduce((sum, w) => sum + w.volumeKg, 0)).toBe(640 + 510 + 600 + 640 + 90)
  })
})

describe('records and balance', () => {
  it('finds the best set per exercise by estimated 1RM', () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100)
    expect(estimatedOneRepMax(80, 8)).toBeCloseTo(101.33, 1)
    const records = personalRecords(WORKOUTS)
    const bench = records.find((r) => r.exerciseId === 'bench')!
    expect(bench).toMatchObject({ weightKg: 85, reps: 6 }) // 85×6 ≈ 102 beats 80×8 ≈ 101.3 and 90×1
    expect(records.find((r) => r.exerciseId === 'row')).toMatchObject({ weightKg: 60, reps: 10 })
  })

  it('shares completed sets across muscle groups', () => {
    const balance = muscleBalance(WORKOUTS)
    expect(balance.map((b) => b.muscle)).toEqual(['chest', 'back'])
    expect(balance[0]).toMatchObject({ sets: 4 })
    expect(balance[0]!.share + balance[1]!.share).toBeCloseTo(1)
  })
})
