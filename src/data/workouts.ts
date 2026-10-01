// Workouts: one session at a time can be in progress (endedAt = null); it lives in the database
// so it survives reloads and closing the app. Finishing keeps only completed sets.

import {
  db,
  newId,
  nowIso,
  requestPersistentStorage,
  type Exercise,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from './db'

export interface SessionExercise {
  entry: WorkoutExercise
  exercise: Exercise
  sets: WorkoutSet[]
}

export interface WorkoutDetail {
  workout: Workout
  exercises: SessionExercise[]
}

const DEFAULT_SETS = 3

// ---------- Reading ----------

export async function getActiveWorkout(): Promise<Workout | null> {
  const open = await db.workouts.filter((w) => w.endedAt === null && !w.deletedAt).toArray()
  return open.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
}

export async function getWorkoutDetail(id: string): Promise<WorkoutDetail | null> {
  const workout = await db.workouts.get(id)
  if (!workout || workout.deletedAt) return null
  const [entries, sets, exercises] = await Promise.all([
    db.workoutExercises.where('workoutId').equals(id).toArray(),
    db.sets.where('workoutId').equals(id).toArray(),
    db.exercises.toArray(),
  ])
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  return {
    workout,
    exercises: entries
      .sort((a, b) => a.position - b.position)
      .flatMap((entry) => {
        const exercise = byId.get(entry.exerciseId)
        if (!exercise) return []
        return [
          {
            entry,
            exercise,
            sets: sets
              .filter((set) => set.workoutExerciseId === entry.id)
              .sort((a, b) => a.position - b.position),
          },
        ]
      }),
  }
}

// Finished, not deleted, newest first.
export async function listWorkouts(): Promise<WorkoutDetail[]> {
  const workouts = await db.workouts.orderBy('startedAt').reverse().toArray()
  const finished = workouts.filter((w) => w.endedAt !== null && !w.deletedAt)
  const details = await Promise.all(finished.map((w) => getWorkoutDetail(w.id)))
  return details.filter((detail): detail is WorkoutDetail => detail !== null)
}

// Sets from the most recent finished session that included this exercise ("Previous" column).
export async function previousSets(
  exerciseId: string,
  excludeWorkoutId?: string,
): Promise<WorkoutSet[]> {
  const entries = await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray()
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.workoutId !== excludeWorkoutId)
      .map(async (entry) => ({ entry, workout: await db.workouts.get(entry.workoutId) })),
  )
  const latest = candidates
    .filter(({ workout }) => workout && workout.endedAt !== null && !workout.deletedAt)
    .sort((a, b) => b.workout!.startedAt.localeCompare(a.workout!.startedAt))[0]
  if (!latest) return []
  const sets = await db.sets.where('workoutExerciseId').equals(latest.entry.id).toArray()
  return sets.sort((a, b) => a.position - b.position)
}

// How often each exercise appears in finished workouts (for "Frequently logged").
export async function exerciseUsage(): Promise<Map<string, number>> {
  const [entries, workouts] = await Promise.all([
    db.workoutExercises.toArray(),
    db.workouts.toArray(),
  ])
  const valid = new Set(workouts.filter((w) => w.endedAt !== null && !w.deletedAt).map((w) => w.id))
  const usage = new Map<string, number>()
  for (const entry of entries) {
    if (valid.has(entry.workoutId))
      usage.set(entry.exerciseId, (usage.get(entry.exerciseId) ?? 0) + 1)
  }
  return usage
}

// ---------- Session lifecycle ----------

// Check-and-create happens in one transaction, so two quick calls (double tap, React's dev
// double effects) can't create two sessions.
export async function startWorkout(startedAt: string = nowIso()): Promise<Workout> {
  const workout = await db.transaction('rw', db.workouts, async () => {
    const active = await getActiveWorkout()
    if (active) return active
    const now = nowIso()
    const created: Workout = {
      id: newId(),
      name: null,
      startedAt,
      endedAt: null,
      pausedMs: 0,
      pausedAt: null,
      note: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    await db.workouts.add(created)
    return created
  })
  void requestPersistentStorage()
  return workout
}

export async function pauseWorkout(id: string): Promise<void> {
  const workout = await db.workouts.get(id)
  if (!workout || workout.pausedAt || workout.endedAt) return
  await db.workouts.update(id, { pausedAt: nowIso(), updatedAt: nowIso() })
}

export async function resumeWorkout(id: string): Promise<void> {
  const workout = await db.workouts.get(id)
  if (!workout?.pausedAt) return
  const pausedFor = Date.now() - new Date(workout.pausedAt).getTime()
  await db.workouts.update(id, {
    pausedAt: null,
    pausedMs: workout.pausedMs + Math.max(0, pausedFor),
    updatedAt: nowIso(),
  })
}

// Ends the session, keeping only completed sets (and exercises that still have some).
// Returns false (and changes nothing) when no set was completed.
export async function finishWorkout(id: string): Promise<boolean> {
  return db.transaction('rw', db.workouts, db.workoutExercises, db.sets, async () => {
    const workout = await db.workouts.get(id)
    if (!workout) return false
    const sets = await db.sets.where('workoutId').equals(id).toArray()
    if (!sets.some((set) => set.done)) return false
    await db.sets.bulkDelete(sets.filter((set) => !set.done).map((set) => set.id))
    const keptEntries = new Set(sets.filter((set) => set.done).map((set) => set.workoutExerciseId))
    const entries = await db.workoutExercises.where('workoutId').equals(id).toArray()
    await db.workoutExercises.bulkDelete(
      entries.filter((e) => !keptEntries.has(e.id)).map((e) => e.id),
    )
    const end = workout.pausedAt ?? nowIso() // a paused session ends when it was paused
    await db.workouts.update(id, { endedAt: end, pausedAt: null, updatedAt: nowIso() })
    return true
  })
}

// Throw away an in-progress session entirely.
export async function discardWorkout(id: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.workoutExercises, db.sets, async () => {
    await db.sets.where('workoutId').equals(id).delete()
    await db.workoutExercises.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

// Remove a finished session (soft delete, so backups/sync can see it went away).
export async function deleteWorkout(id: string): Promise<void> {
  const now = nowIso()
  await db.workouts.update(id, { deletedAt: now, updatedAt: now })
}

export async function updateWorkout(
  id: string,
  changes: Partial<Pick<Workout, 'name' | 'note' | 'startedAt' | 'endedAt'>>,
): Promise<void> {
  const clean = { ...changes }
  if ('name' in clean) clean.name = clean.name?.trim().slice(0, 60) || null
  if ('note' in clean) clean.note = clean.note?.trim().slice(0, 1000) || null
  await db.workouts.update(id, { ...clean, updatedAt: nowIso() })
}

// ---------- Exercises and sets ----------

// Adds an exercise; its first sets copy the last session's numbers (not yet done).
export async function addExercise(workoutId: string, exerciseId: string): Promise<WorkoutExercise> {
  const existing = await db.workoutExercises.where('workoutId').equals(workoutId).toArray()
  const entry: WorkoutExercise = {
    id: newId(),
    workoutId,
    exerciseId,
    position: existing.length ? Math.max(...existing.map((e) => e.position)) + 1 : 0,
    note: null,
  }
  const previous = await previousSets(exerciseId, workoutId)
  const now = nowIso()
  const template = previous.length ? previous : Array.from({ length: DEFAULT_SETS }, () => null)
  const sets: WorkoutSet[] = template.map((prev, position) => ({
    id: newId(),
    workoutId,
    workoutExerciseId: entry.id,
    position,
    reps: prev?.reps ?? null,
    weightKg: prev?.weightKg ?? null,
    done: false,
    createdAt: now,
    updatedAt: now,
  }))
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.workoutExercises.add(entry)
    await db.sets.bulkAdd(sets)
  })
  return entry
}

export async function removeExercise(entryId: string): Promise<void> {
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.sets.where('workoutExerciseId').equals(entryId).delete()
    await db.workoutExercises.delete(entryId)
  })
}

export async function setExerciseNote(entryId: string, note: string): Promise<void> {
  await db.workoutExercises.update(entryId, { note: note.trim().slice(0, 300) || null })
}

// New set copies the last one's numbers so you only adjust what changed.
export async function addSet(entryId: string): Promise<WorkoutSet> {
  const entry = await db.workoutExercises.get(entryId)
  if (!entry) throw new Error('Exercise not found in workout')
  const sets = await db.sets.where('workoutExerciseId').equals(entryId).toArray()
  const last = sets.sort((a, b) => a.position - b.position).at(-1)
  const now = nowIso()
  const set: WorkoutSet = {
    id: newId(),
    workoutId: entry.workoutId,
    workoutExerciseId: entryId,
    position: last ? last.position + 1 : 0,
    reps: last?.reps ?? null,
    weightKg: last?.weightKg ?? null,
    done: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.sets.add(set)
  return set
}

export async function updateSet(
  id: string,
  changes: Partial<Pick<WorkoutSet, 'reps' | 'weightKg' | 'done'>>,
): Promise<void> {
  const clean = { ...changes }
  if (clean.reps != null) clean.reps = Math.max(0, Math.min(999, Math.round(clean.reps)))
  if (clean.weightKg != null) clean.weightKg = Math.max(0, Math.min(1000, clean.weightKg))
  await db.sets.update(id, { ...clean, updatedAt: nowIso() })
}

export async function removeSet(id: string): Promise<void> {
  await db.sets.delete(id)
}
