import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { db } from './db'
import { BUILT_IN_EXERCISES } from './exercises'
import {
  addWeight,
  createExercise,
  deleteWeight,
  getProfile,
  listExercises,
  listWeights,
  saveProfile,
  updateWeight,
} from './repos'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('weights', () => {
  it('lists newest first and hides deleted entries', async () => {
    const older = await addWeight({
      recordedAt: '2026-09-01T07:00:00Z',
      kind: 'general',
      weightKg: 74,
    })
    await addWeight({
      recordedAt: '2026-09-03T07:00:00Z',
      kind: 'before_gym',
      weightKg: 73.4,
      note: '  light ',
    })
    let list = await listWeights()
    expect(list.map((w) => w.weightKg)).toEqual([73.4, 74])
    expect(list[0]?.note).toBe('light')

    await deleteWeight(older.id)
    list = await listWeights()
    expect(list).toHaveLength(1)
    expect((await db.weights.get(older.id))?.deletedAt).toBeTruthy()
  })

  it('edits an entry, including its date', async () => {
    const entry = await addWeight({
      recordedAt: '2026-09-03T07:00:00Z',
      kind: 'general',
      weightKg: 73,
    })
    await updateWeight(entry.id, {
      recordedAt: '2026-08-30T08:00:00Z',
      kind: 'after_gym',
      weightKg: 72.6,
      note: '',
    })
    const saved = await db.weights.get(entry.id)
    expect(saved).toMatchObject({
      recordedAt: '2026-08-30T08:00:00Z',
      kind: 'after_gym',
      weightKg: 72.6,
      note: null,
    })
    expect(saved!.updatedAt >= entry.updatedAt).toBe(true)
  })

  it('rejects impossible weights', async () => {
    await expect(
      addWeight({ recordedAt: '2026-09-01T07:00:00Z', kind: 'general', weightKg: 3 }),
    ).rejects.toThrow(RangeError)
    await expect(
      addWeight({ recordedAt: '2026-09-01T07:00:00Z', kind: 'general', weightKg: NaN }),
    ).rejects.toThrow()
  })
})

describe('exercises', () => {
  it('seeds the built-in library on first open', async () => {
    const list = await listExercises()
    expect(list).toHaveLength(BUILT_IN_EXERCISES.length)
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length)
    expect(list.find((e) => e.id === 'bi-barbell-bench-press')?.muscle).toBe('chest')
  })

  it('creates custom exercises without duplicating names', async () => {
    const custom = await createExercise({
      name: '  Landmine   Press ',
      muscle: 'shoulders',
      equipment: 'barbell',
    })
    expect(custom).toMatchObject({ name: 'Landmine Press', isCustom: true })
    const again = await createExercise({
      name: 'landmine press',
      muscle: 'chest',
      equipment: 'other',
    })
    expect(again.id).toBe(custom.id)
    const builtIn = await createExercise({ name: 'deadlift', muscle: 'back', equipment: 'barbell' })
    expect(builtIn.isCustom).toBe(false)
  })
})

describe('profile', () => {
  it('starts empty and saves partial changes', async () => {
    expect(await getProfile()).toMatchObject({ heightCm: null, targetWeightKg: null })
    await saveProfile({ heightCm: 178 })
    await saveProfile({ targetWeightKg: 72 })
    expect(await getProfile()).toMatchObject({ heightCm: 178, targetWeightKg: 72 })
  })
})
