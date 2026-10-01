// Numbers about workouts, free of React and the database so they're easy to test.

import type { MuscleGroup, Workout, WorkoutSet } from '../../data/db'
import type { WorkoutDetail } from '../../data/workouts'

// Sum of reps × weight over completed sets.
export function volumeKg(sets: WorkoutSet[]): number {
  return sets.reduce(
    (sum, set) => (set.done ? sum + (set.reps ?? 0) * (set.weightKg ?? 0) : sum),
    0,
  )
}

export function doneSets(sets: WorkoutSet[]): number {
  return sets.filter((set) => set.done).length
}

// Active time: start to end (or now), minus time spent paused.
export function elapsedMs(workout: Workout, now: number = Date.now()): number {
  const end = workout.endedAt
    ? new Date(workout.endedAt).getTime()
    : workout.pausedAt
      ? new Date(workout.pausedAt).getTime()
      : now
  return Math.max(0, end - new Date(workout.startedAt).getTime() - workout.pausedMs)
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

// Muscle groups trained, most sets first.
export function musclesWorked(detail: WorkoutDetail): MuscleGroup[] {
  const counts = new Map<MuscleGroup, number>()
  for (const { exercise, sets } of detail.exercises) {
    counts.set(exercise.muscle, (counts.get(exercise.muscle) ?? 0) + doneSets(sets))
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([muscle]) => muscle)
}

export interface WorkoutSummary {
  durationMs: number
  sets: number
  volumeKg: number
}

export function summarize(detail: WorkoutDetail, now?: number): WorkoutSummary {
  const sets = detail.exercises.flatMap((e) => e.sets)
  return {
    durationMs: elapsedMs(detail.workout, now),
    sets: doneSets(sets),
    volumeKg: volumeKg(sets),
  }
}
