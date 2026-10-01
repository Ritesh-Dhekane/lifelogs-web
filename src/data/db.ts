// The on-device database (IndexedDB via Dexie). Every log keeps its own tables here.
// Rows carry createdAt/updatedAt and, where it matters, deletedAt (soft delete) so backups and a
// future sync can reason about changes. Weights are always stored in kg.

import Dexie, { type EntityTable } from 'dexie'

import { BUILT_IN_EXERCISES } from './exercises'

export type WeightKind = 'before_gym' | 'after_gym' | 'general'
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core'
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other'

export interface WeightEntry {
  id: string
  recordedAt: string // ISO timestamp
  kind: WeightKind
  weightKg: number
  note: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Exercise {
  id: string
  name: string
  muscle: MuscleGroup
  equipment: Equipment
  isCustom: boolean
  createdAt: string
}

export interface Workout {
  id: string
  name: string | null
  startedAt: string
  endedAt: string | null // null while the session is in progress
  pausedMs: number // time the timer spent paused
  pausedAt: string | null // set while paused
  note: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// One exercise inside a workout (its order and note); its sets point here.
export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: string
  position: number
  note: string | null
}

export interface WorkoutSet {
  id: string
  workoutId: string
  workoutExerciseId: string
  position: number
  reps: number | null
  weightKg: number | null
  done: boolean
  createdAt: string
  updatedAt: string
}

// Progress photo, resized on the device. Image bytes are ArrayBuffers (clone-safe everywhere).
export interface ProgressPhoto {
  id: string
  takenAt: string
  mime: string
  width: number
  height: number
  data: ArrayBuffer // full image (long side ≤ 1600 px)
  thumb: ArrayBuffer // ~400 px for grids
  note: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Profile {
  id: 'me'
  name: string | null
  heightCm: number | null
  goal: string | null
  targetWeightKg: number | null
  updatedAt: string
}

export class LifeLogsDB extends Dexie {
  weights!: EntityTable<WeightEntry, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  profile!: EntityTable<Profile, 'id'>
  photos!: EntityTable<ProgressPhoto, 'id'>

  constructor(name = 'lifelogs') {
    super(name)
    // Only indexed fields are listed; never change a version once shipped — add a new one.
    this.version(1).stores({
      weights: 'id, recordedAt',
      exercises: 'id, name, muscle',
      workouts: 'id, startedAt, endedAt',
      workoutExercises: 'id, workoutId, exerciseId',
      sets: 'id, workoutId, workoutExerciseId',
      profile: 'id',
    })
    this.version(2).stores({ photos: 'id, takenAt' })
    this.on('populate', (tx) => {
      const now = new Date().toISOString()
      tx.table('exercises').bulkAdd(
        BUILT_IN_EXERCISES.map((exercise) => ({ ...exercise, isCustom: false, createdAt: now })),
      )
    })
  }
}

export const db = new LifeLogsDB()

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

// Ask the browser not to clear our data when space runs low. Safe to call often.
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    return (await navigator.storage.persisted()) || (await navigator.storage.persist())
  } catch {
    return false
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    return estimate ? { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 } : null
  } catch {
    return null
  }
}
