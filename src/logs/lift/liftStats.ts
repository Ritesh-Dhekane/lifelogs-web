// Training statistics for the Stats tab. Pure functions over finished workouts.

import type { MuscleGroup } from '../../data/db'
import type { WorkoutDetail } from '../../data/workouts'
import type { WeekStart } from '../../lib/prefs'
import type { Range } from './weightStats'
import { doneSets, volumeKg } from './workoutStats'

const DAY = 24 * 60 * 60 * 1000
const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 }

export interface PeriodTotals {
  sessions: number
  sets: number
  volumeKg: number
}

export interface LiftStats {
  current: PeriodTotals
  previous: PeriodTotals | null // the same length of time just before; null for "all"
  days: number // length of the current period
}

function startedMs(detail: WorkoutDetail): number {
  return new Date(detail.workout.startedAt).getTime()
}

function totals(workouts: WorkoutDetail[]): PeriodTotals {
  const sets = workouts.flatMap((w) => w.exercises.flatMap((e) => e.sets))
  return { sessions: workouts.length, sets: doneSets(sets), volumeKg: volumeKg(sets) }
}

export function periodStats(workouts: WorkoutDetail[], range: Range, now: Date): LiftStats {
  if (range === 'all') {
    const first = Math.min(...workouts.map(startedMs), now.getTime())
    return {
      current: totals(workouts),
      previous: null,
      days: Math.max(1, Math.ceil((now.getTime() - first) / DAY)),
    }
  }
  const days = RANGE_DAYS[range]
  const from = now.getTime() - days * DAY
  const before = from - days * DAY
  return {
    current: totals(workouts.filter((w) => startedMs(w) >= from)),
    previous: totals(workouts.filter((w) => startedMs(w) >= before && startedMs(w) < from)),
    days,
  }
}

// Percentage change, or null when there's nothing to compare with.
export function change(current: number, previous: number | null | undefined): number | null {
  if (!previous) return null
  return (current - previous) / previous
}

// ---------- Weeks ----------

export function weekStart(date: Date, start: WeekStart): Date {
  const day = date.getDay() // 0 = Sunday
  const offset = start === 'monday' ? (day + 6) % 7 : day
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
}

// Consecutive weeks (ending this week or last week) with at least one workout, plus the best run.
export function weekStreaks(
  workouts: WorkoutDetail[],
  now: Date,
  start: WeekStart,
): { current: number; best: number } {
  const weeks = new Set(
    workouts.map((w) => weekStart(new Date(w.workout.startedAt), start).getTime()),
  )
  const sorted = [...weeks].sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const week of sorted) {
    run = prev !== null && isNextWeek(prev, week) ? run + 1 : 1
    best = Math.max(best, run)
    prev = week
  }
  // Current streak: count back from this week (or last week, if this week has none yet).
  let cursor = weekStart(now, start)
  if (!weeks.has(cursor.getTime())) cursor = shiftWeeks(cursor, -1)
  let current = 0
  while (weeks.has(cursor.getTime())) {
    current++
    cursor = shiftWeeks(cursor, -1)
  }
  return { current, best }
}

function shiftWeeks(date: Date, weeks: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7)
}

function isNextWeek(a: number, b: number): boolean {
  return shiftWeeks(new Date(a), 1).getTime() === b
}

export interface VolumeBar {
  label: string
  start: Date
  volumeKg: number
}

// Daily bars for 7D, otherwise weekly bars (at most 13) ending this week.
export function volumeBars(
  workouts: WorkoutDetail[],
  range: Range,
  now: Date,
  start: WeekStart,
): VolumeBar[] {
  if (range === '7d') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i))
      const next = day.getTime() + DAY
      const volume = workouts
        .filter((w) => startedMs(w) >= day.getTime() && startedMs(w) < next)
        .reduce((sum, w) => sum + volumeKg(w.exercises.flatMap((e) => e.sets)), 0)
      return {
        label: day.toLocaleDateString('en-US', { weekday: 'narrow' }),
        start: day,
        volumeKg: volume,
      }
    })
  }
  const count = range === '30d' ? 5 : 13
  const thisWeek = weekStart(now, start)
  return Array.from({ length: count }, (_, i) => {
    const from = shiftWeeks(thisWeek, i - (count - 1))
    const to = shiftWeeks(from, 1).getTime()
    const volume = workouts
      .filter((w) => startedMs(w) >= from.getTime() && startedMs(w) < to)
      .reduce((sum, w) => sum + volumeKg(w.exercises.flatMap((e) => e.sets)), 0)
    return {
      label: from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      start: from,
      volumeKg: volume,
    }
  })
}

// ---------- Records ----------

// Epley estimate of a one-rep max. A single is the 1RM itself.
export function estimatedOneRepMax(weightKg: number, reps: number): number {
  return reps <= 1 ? weightKg : weightKg * (1 + reps / 30)
}

export interface PersonalRecord {
  exerciseId: string
  name: string
  weightKg: number
  reps: number
  oneRepMaxKg: number
  date: string
}

// Best completed set per exercise (by estimated 1RM), newest records first.
export function personalRecords(workouts: WorkoutDetail[]): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>()
  for (const detail of workouts) {
    for (const { exercise, sets } of detail.exercises) {
      for (const set of sets) {
        if (!set.done || !set.reps || !set.weightKg) continue
        const oneRepMaxKg = estimatedOneRepMax(set.weightKg, set.reps)
        const current = best.get(exercise.id)
        if (!current || oneRepMaxKg > current.oneRepMaxKg) {
          best.set(exercise.id, {
            exerciseId: exercise.id,
            name: exercise.name,
            weightKg: set.weightKg,
            reps: set.reps,
            oneRepMaxKg,
            date: detail.workout.startedAt,
          })
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.date.localeCompare(a.date))
}

// Share of completed sets per muscle group, biggest first.
export function muscleBalance(
  workouts: WorkoutDetail[],
): { muscle: MuscleGroup; sets: number; share: number }[] {
  const counts = new Map<MuscleGroup, number>()
  for (const detail of workouts) {
    for (const { exercise, sets } of detail.exercises) {
      counts.set(exercise.muscle, (counts.get(exercise.muscle) ?? 0) + doneSets(sets))
    }
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  return [...counts.entries()]
    .filter(([, sets]) => sets > 0)
    .map(([muscle, sets]) => ({ muscle, sets, share: sets / total }))
    .sort((a, b) => b.sets - a.sets)
}
