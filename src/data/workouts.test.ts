import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { summarize, elapsedMs, formatClock, musclesWorked } from '../logs/lift/workoutStats'
import { db } from './db'
import {
  addExercise,
  addSet,
  deleteWorkout,
  discardWorkout,
  exerciseUsage,
  finishWorkout,
  getActiveWorkout,
  getWorkoutDetail,
  listWorkouts,
  previousSets,
  removeExercise,
  startWorkout,
  updateSet,
} from './workouts'

const BENCH = 'bi-barbell-bench-press'
const CURL = 'bi-dumbbell-curl'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function completeAll(workoutId: string, reps = 10, kg = 60) {
  const sets = await db.sets.where('workoutId').equals(workoutId).toArray()
  for (const set of sets) await updateSet(set.id, { reps, weightKg: kg, done: true })
}

describe('session lifecycle', () => {
  it('keeps a single in-progress workout that survives "reloads"', async () => {
    const first = await startWorkout()
    const again = await startWorkout()
    expect(again.id).toBe(first.id)
    expect((await getActiveWorkout())?.id).toBe(first.id)
  })

  it('never creates two sessions when started twice at once', async () => {
    const [a, b] = await Promise.all([startWorkout(), startWorkout()])
    expect(a.id).toBe(b.id)
    expect(await db.workouts.count()).toBe(1)
  })

  it('adds exercises with three empty sets the first time', async () => {
    const workout = await startWorkout()
    const entry = await addExercise(workout.id, BENCH)
    const detail = await getWorkoutDetail(workout.id)
    expect(detail?.exercises[0]?.entry.id).toBe(entry.id)
    expect(detail?.exercises[0]?.sets).toHaveLength(3)
    expect(detail?.exercises[0]?.sets.every((s) => s.reps === null && !s.done)).toBe(true)
  })

  it('finishes with only completed sets, and refuses an empty session', async () => {
    const workout = await startWorkout()
    const bench = await addExercise(workout.id, BENCH)
    await addExercise(workout.id, CURL)
    expect(await finishWorkout(workout.id)).toBe(false)

    const benchSets = await db.sets.where('workoutExerciseId').equals(bench.id).toArray()
    await updateSet(benchSets[0]!.id, { reps: 8, weightKg: 80, done: true })
    await updateSet(benchSets[1]!.id, { reps: 8, weightKg: 82.5, done: true })
    expect(await finishWorkout(workout.id)).toBe(true)

    const detail = await getWorkoutDetail(workout.id)
    expect(detail?.workout.endedAt).toBeTruthy()
    expect(detail?.exercises).toHaveLength(1) // curls had no completed sets
    expect(detail?.exercises[0]?.sets).toHaveLength(2)
    expect(summarize(detail!).volumeKg).toBe(8 * 80 + 8 * 82.5)
    expect(musclesWorked(detail!)).toEqual(['chest'])
    expect(await getActiveWorkout()).toBeNull()
  })

  it('prefills the next session from the previous one', async () => {
    const one = await startWorkout()
    await addExercise(one.id, BENCH)
    await completeAll(one.id, 8, 80)
    await finishWorkout(one.id)

    const two = await startWorkout()
    const entry = await addExercise(two.id, BENCH)
    const sets = await db.sets.where('workoutExerciseId').equals(entry.id).toArray()
    expect(sets).toHaveLength(3)
    expect(sets.every((s) => s.reps === 8 && s.weightKg === 80 && !s.done)).toBe(true)
    expect((await previousSets(BENCH, two.id)).map((s) => s.weightKg)).toEqual([80, 80, 80])

    const extra = await addSet(entry.id)
    expect(extra).toMatchObject({ position: 3, reps: 8, weightKg: 80, done: false })
  })

  it('discards, removes and deletes', async () => {
    const workout = await startWorkout()
    const entry = await addExercise(workout.id, BENCH)
    await removeExercise(entry.id)
    expect(await db.sets.where('workoutId').equals(workout.id).count()).toBe(0)
    await discardWorkout(workout.id)
    expect(await db.workouts.get(workout.id)).toBeUndefined()

    const done = await startWorkout()
    await addExercise(done.id, CURL)
    await completeAll(done.id)
    await finishWorkout(done.id)
    expect(await listWorkouts()).toHaveLength(1)
    expect((await exerciseUsage()).get(CURL)).toBe(1)
    await deleteWorkout(done.id)
    expect(await listWorkouts()).toHaveLength(0)
    expect((await exerciseUsage()).get(CURL)).toBeUndefined()
  })
})

describe('timing', () => {
  it('subtracts paused time and formats a clock', () => {
    const workout = {
      id: 'w',
      name: null,
      startedAt: '2026-10-01T10:00:00Z',
      endedAt: '2026-10-01T11:00:00Z',
      pausedMs: 5 * 60_000,
      pausedAt: null,
      note: null,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    }
    expect(elapsedMs(workout)).toBe(55 * 60_000)
    expect(formatClock(34 * 60_000 + 21_000)).toBe('34:21')
    expect(formatClock(3_725_000)).toBe('1:02:05')
  })
})
