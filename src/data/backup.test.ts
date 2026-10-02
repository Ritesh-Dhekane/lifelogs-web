import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { getPrefs, setPrefs } from '../lib/prefs'
import { BackupError, createBackup, parseBackup, restoreBackup } from './backup'
import { db } from './db'
import { addCategory, addExpense, listExpenses } from './expenses'
import { addPhoto, deletePhoto, listPhotos } from './photos'
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
  const bytes = (n: number) => new Uint8Array(Array.from({ length: n }, (_, i) => i % 256)).buffer
  await addPhoto({
    takenAt: '2026-09-30T07:30:00Z',
    note: 'Front',
    image: { data: bytes(5000), mime: 'image/jpeg', width: 1200, height: 1600 },
    thumb: { data: bytes(300), mime: 'image/jpeg', width: 300, height: 400 },
  })
  await addExpense({ spentAt: '2026-09-30T13:00:00Z', amountMinor: 45050, categoryId: 'cat-food' })
  await addCategory({ name: 'Pets', icon: 'pet', color: '#a2845e' })
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
    const [photo] = await listPhotos()
    expect(new Uint8Array(photo!.data)[4999]).toBe(4999 % 256)
    expect(photo!.thumb.byteLength).toBe(300)
    expect(getPrefs().units.weight).toBe('lb')
    expect((await listExpenses())[0]!.amountMinor).toBe(45050)
  })

  it('keeps the built-in categories when restoring a backup from before Expenses', async () => {
    const v2 = JSON.stringify({
      app: 'lifelogs',
      version: 2,
      exportedAt: '',
      prefs: {},
      tables: {},
    })
    await restoreBackup(parseBackup(v2))
    expect(await db.expenseCategories.count()).toBeGreaterThan(10)
    expect(await listExpenses()).toEqual([])
  })

  it('still restores version 1 backups (before photos)', async () => {
    const v1 = JSON.stringify({
      app: 'lifelogs',
      version: 1,
      exportedAt: '',
      prefs: {},
      tables: { weights: [] },
    })
    await restoreBackup(parseBackup(v1))
    expect(await listPhotos()).toEqual([])
  })

  it('drops image bytes when a photo is deleted', async () => {
    await seed()
    const [photo] = await listPhotos()
    await deletePhoto(photo!.id)
    expect(await listPhotos()).toEqual([])
    expect((await db.photos.get(photo!.id))?.data.byteLength).toBe(0)
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
