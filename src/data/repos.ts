// Reading and writing Lift data. Screens never touch tables directly; they go through these.

import {
  db,
  newId,
  nowIso,
  requestPersistentStorage,
  type Exercise,
  type Profile,
  type WeightEntry,
  type WeightKind,
} from './db'

// ---------- Weights ----------

export interface WeightInput {
  recordedAt: string
  kind: WeightKind
  weightKg: number
  note?: string | null
}

export async function listWeights(): Promise<WeightEntry[]> {
  const rows = await db.weights.orderBy('recordedAt').reverse().toArray()
  return rows.filter((row) => !row.deletedAt)
}

export async function addWeight(input: WeightInput): Promise<WeightEntry> {
  validateWeight(input.weightKg)
  const now = nowIso()
  const entry: WeightEntry = {
    id: newId(),
    recordedAt: input.recordedAt,
    kind: input.kind,
    weightKg: input.weightKg,
    note: cleanNote(input.note),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.weights.add(entry)
  void requestPersistentStorage()
  return entry
}

export async function updateWeight(id: string, input: WeightInput): Promise<void> {
  validateWeight(input.weightKg)
  await db.weights.update(id, {
    recordedAt: input.recordedAt,
    kind: input.kind,
    weightKg: input.weightKg,
    note: cleanNote(input.note),
    updatedAt: nowIso(),
  })
}

export async function deleteWeight(id: string): Promise<void> {
  const now = nowIso()
  await db.weights.update(id, { deletedAt: now, updatedAt: now })
}

function validateWeight(kg: number) {
  if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
    throw new RangeError('Weight must be between 20 and 400 kg')
  }
}

function cleanNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim()
  return trimmed ? trimmed.slice(0, 500) : null
}

// ---------- Exercises ----------

export async function listExercises(): Promise<Exercise[]> {
  return db.exercises.orderBy('name').toArray()
}

export async function createExercise(
  input: Pick<Exercise, 'name' | 'muscle' | 'equipment'>,
): Promise<Exercise> {
  const name = input.name.trim().replace(/\s+/g, ' ')
  if (!name) throw new Error('Exercise needs a name')
  const existing = (await db.exercises.toArray()).find(
    (exercise) => exercise.name.toLowerCase() === name.toLowerCase(),
  )
  if (existing) return existing
  const exercise: Exercise = {
    id: newId(),
    name: name.slice(0, 60),
    muscle: input.muscle,
    equipment: input.equipment,
    isCustom: true,
    createdAt: nowIso(),
  }
  await db.exercises.add(exercise)
  return exercise
}

// ---------- Profile ----------

const EMPTY_PROFILE: Profile = {
  id: 'me',
  name: null,
  heightCm: null,
  goal: null,
  targetWeightKg: null,
  updatedAt: '',
}

export async function getProfile(): Promise<Profile> {
  return (await db.profile.get('me')) ?? EMPTY_PROFILE
}

export async function saveProfile(
  changes: Partial<Omit<Profile, 'id' | 'updatedAt'>>,
): Promise<void> {
  const current = await getProfile()
  await db.profile.put({ ...current, ...changes, id: 'me', updatedAt: nowIso() })
}
