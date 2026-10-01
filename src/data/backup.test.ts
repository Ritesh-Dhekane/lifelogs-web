import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { getPrefs, setPrefs } from '../lib/prefs'
import { BackupError, createBackup, parseBackup, restoreBackup } from './backup'
import { db } from './db'
import { addWeight, createExercise, saveProfile } from './repos'
import { addExercise, finishWorkout, startWorkout, updateSet } from './workouts'

// localStorage for prefs in the node test environment.
const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function seed() {
  await addWeight({
    recordedAt: '2026-09-30T07:00:00Z',
    kind: 'before_gym',
    weightKg: 73.4,
    note: 'ok',
  })
  const custom = await createExercise({
    name: 'Landmine Press',
    muscle: 'shoulders',
    equipment: 'barbell',
  })
  const workout = await startWorkout('2026-09-30T08:00:00Z')
  await addExercise(workout.id, custom.id)
  for (const set of await db.sets.toArray())
    await updateSet(set.id, { reps: 8, weightKg: 30, done: true })
  await finishWorkout(workout.id)
  await saveProfile({ heightCm: 178, targetWeightKg: 72 })
}

describe('backup', () => {
  it('round-trips every table and the preferences', async () => {
    await seed()
    setPrefs((p) => ({ ...p, units: { weight: 'lb' } }))
    const backup = await createBackup()
    const text = JSON.stringify(backup)

    await db.delete()
    await db.open()
    setPrefs((p) => ({ ...p, units: { weight: 'kg' } }))
    expect(await db.weights.count()).toBe(0)

    await restoreBackup(parseBackup(text))
    const again = await createBackup()
    expect(again.tables).toEqual(backup.tables)
    expect(getPrefs().units.weight).toBe('lb')
  })

  it('rejects files that are not LifeLogs backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError)
    expect(() => parseBackup('{"app":"other","version":1,"tables":{}}')).toThrow(
      "isn't a LifeLogs backup",
    )
    expect(() => parseBackup('{"app":"lifelogs","version":99,"tables":{}}')).toThrow(
      'newer version',
    )
    expect(() =>
      parseBackup('{"app":"lifelogs","version":1,"tables":{"weights":[{"no":"id"}]}}'),
    ).toThrow('damaged')
  })
})
