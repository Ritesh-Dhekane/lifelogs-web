// The on-device database (IndexedDB via Dexie). Every log keeps its own tables here.
// Rows carry createdAt/updatedAt and, where it matters, deletedAt (soft delete) so backups and a
// future sync can reason about changes. Weights are always stored in kg.

import Dexie, { type EntityTable } from 'dexie'

import { BUILT_IN_CATEGORIES } from './expenseCategories'
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

// ---------- Expenses ----------

export type PaidWith = 'cash' | 'card' | 'upi' | 'other'

export interface Expense {
  id: string
  spentAt: string // ISO timestamp
  amountMinor: number // whole paise/cents, always > 0
  categoryId: string
  paidWith: PaidWith | null
  note: string | null
  recurringId: string | null // set when a recurring bill logged it
  linkedTo: string | null // e.g. a vehicle fuel entry that created it
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ExpenseCategory {
  id: string
  name: string
  icon: string // key into the category icon map
  color: string // hex, used for dots and bars only (never for text)
  budgetMinor: number | null // monthly budget
  position: number
  isCustom: boolean
  archived: boolean
}

export type Cadence = 'weekly' | 'monthly' | 'yearly'

export interface Recurring {
  id: string
  name: string
  kind: 'subscription' | 'bill'
  amountMinor: number
  categoryId: string
  cadence: Cadence
  startOn: string // YYYY-MM-DD, the first due date; later ones keep its day of month
  nextDue: string // YYYY-MM-DD
  autoLog: boolean // add an expense on each due date
  note: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// ---------- Home ----------
// Calendar dates (bought on, expires on, start on) are local "YYYY-MM-DD" strings; moments are ISO.

export type ThingKind = 'item' | 'document'

export interface Thing {
  id: string
  kind: ThingKind
  name: string
  category: string // key into the thing category labels (electronics, insurance…)
  place: string | null // where it is (items) or who issued it (documents)
  boughtOn: string | null
  priceMinor: number | null
  expiresOn: string | null // warranty end (items) or expiry (documents)
  remindDays: number // show it as due this many days before expiresOn
  note: string | null
  photoId: string | null // an Attachment (receipt or the item)
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// Image attached to something (a thing's receipt or photo). Same shape as progress photos.
export interface Attachment {
  id: string
  ownerId: string
  mime: string
  width: number
  height: number
  data: ArrayBuffer
  thumb: ArrayBuffer
  createdAt: string
}

export type VehicleType = 'car' | 'bike' | 'scooter' | 'other'

export interface Vehicle {
  id: string
  name: string
  type: VehicleType
  serviceEveryKm: number | null
  serviceEveryMonths: number | null
  archived: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type VehicleLogKind = 'fuel' | 'service' | 'odometer'

export interface VehicleLog {
  id: string
  vehicleId: string
  kind: VehicleLogKind
  at: string // ISO
  odometerKm: number | null
  litres: number | null // fuel only
  fullTank: boolean // fuel only; mileage is measured between full tanks
  costMinor: number | null
  note: string | null
  expenseId: string | null // the matching entry in Expenses, if one was added
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type CareGroup = 'plant' | 'pet' | 'home'

export interface CareTask {
  id: string
  name: string
  group: CareGroup
  everyDays: number
  startOn: string // first due date when it has never been done
  lastDoneAt: string | null // ISO
  note: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CareLog {
  id: string
  taskId: string
  doneAt: string // ISO
  note: string | null
  createdAt: string
}

export class LifeLogsDB extends Dexie {
  weights!: EntityTable<WeightEntry, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  profile!: EntityTable<Profile, 'id'>
  photos!: EntityTable<ProgressPhoto, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  expenseCategories!: EntityTable<ExpenseCategory, 'id'>
  recurring!: EntityTable<Recurring, 'id'>
  things!: EntityTable<Thing, 'id'>
  attachments!: EntityTable<Attachment, 'id'>
  vehicles!: EntityTable<Vehicle, 'id'>
  vehicleLogs!: EntityTable<VehicleLog, 'id'>
  careTasks!: EntityTable<CareTask, 'id'>
  careLogs!: EntityTable<CareLog, 'id'>

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
    this.version(3)
      .stores({
        expenses: 'id, spentAt, categoryId, recurringId',
        expenseCategories: 'id, position',
        recurring: 'id, nextDue',
      })
      .upgrade((tx) => tx.table('expenseCategories').bulkAdd(BUILT_IN_CATEGORIES))
    this.version(4).stores({
      things: 'id, kind, expiresOn',
      attachments: 'id, ownerId',
      vehicles: 'id',
      vehicleLogs: 'id, vehicleId, at',
      careTasks: 'id, group',
      careLogs: 'id, taskId, doneAt',
    })
    this.on('populate', (tx) => {
      const now = new Date().toISOString()
      tx.table('exercises').bulkAdd(
        BUILT_IN_EXERCISES.map((exercise) => ({ ...exercise, isCustom: false, createdAt: now })),
      )
      tx.table('expenseCategories').bulkAdd(BUILT_IN_CATEGORIES)
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
