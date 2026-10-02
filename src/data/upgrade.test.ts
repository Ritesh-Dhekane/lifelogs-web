import 'fake-indexeddb/auto'

import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'

import { LifeLogsDB } from './db'
import { BUILT_IN_CATEGORIES } from './expenseCategories'

// Someone who installed LifeLogs before Expenses and Home has a version 2 database.
describe('database upgrade', () => {
  it('keeps Lift data and adds the new tables with built-in categories', async () => {
    const name = 'lifelogs-upgrade-test'
    const old = new Dexie(name)
    old.version(1).stores({
      weights: 'id, recordedAt',
      exercises: 'id, name, muscle',
      workouts: 'id, startedAt, endedAt',
      workoutExercises: 'id, workoutId, exerciseId',
      sets: 'id, workoutId, workoutExerciseId',
      profile: 'id',
    })
    old.version(2).stores({ photos: 'id, takenAt' })
    await old.open()
    await old.table('weights').add({ id: 'w1', recordedAt: '2026-09-01T07:00:00Z', weightKg: 74 })
    old.close()

    const db = new LifeLogsDB(name)
    await db.open()
    expect(db.verno).toBe(4)
    expect(await db.weights.get('w1')).toMatchObject({ weightKg: 74 })
    expect(await db.expenseCategories.count()).toBe(BUILT_IN_CATEGORIES.length)
    expect(await db.things.count()).toBe(0)
    db.close()
    await Dexie.delete(name)
  })
})
