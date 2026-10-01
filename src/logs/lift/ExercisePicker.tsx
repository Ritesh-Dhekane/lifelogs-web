// Pick an exercise for the session: search, filter by muscle, frequently logged first,
// or create a custom one.

import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Plus, PlusCircle, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { Sheet } from '../../components/Sheet'
import type { Equipment, Exercise, MuscleGroup } from '../../data/db'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../data/exercises'
import { createExercise, listExercises } from '../../data/repos'
import { exerciseUsage } from '../../data/workouts'

const MUSCLES = Object.keys(MUSCLE_LABEL) as MuscleGroup[]

export function ExercisePicker({
  open,
  onClose,
  onPick,
  exclude,
}: {
  open: boolean
  onClose: () => void
  onPick: (exercise: Exercise) => void
  exclude: string[] // already in the session
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      {open && <PickerBody onPick={onPick} exclude={exclude} />}
    </Sheet>
  )
}

function PickerBody({ onPick, exclude }: { onPick: (e: Exercise) => void; exclude: string[] }) {
  const exercises = useLiveQuery(listExercises)
  const usage = useLiveQuery(exerciseUsage)
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (exercises ?? []).filter(
      (exercise) =>
        !exclude.includes(exercise.id) &&
        (muscle === 'all' || exercise.muscle === muscle) &&
        (!q ||
          exercise.name.toLowerCase().includes(q) ||
          MUSCLE_LABEL[exercise.muscle].toLowerCase().includes(q)),
    )
  }, [exercises, exclude, muscle, query])

  const frequent = useMemo(() => {
    if (!usage || query || muscle !== 'all') return []
    return filtered
      .filter((exercise) => usage.has(exercise.id))
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0))
      .slice(0, 5)
  }, [filtered, usage, query, muscle])

  if (creating) {
    return (
      <CreateExercise
        initialName={query}
        initialMuscle={muscle === 'all' ? 'chest' : muscle}
        onCancel={() => setCreating(false)}
        onCreated={onPick}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex h-11 items-center gap-2 rounded-xl bg-card-2 px-3">
        <Search className="size-4 text-ink-3" />
        <span className="sr-only">Search exercises</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercise or muscle…"
          className="flex-1 bg-transparent text-body outline-none"
          autoComplete="off"
        />
      </label>

      <div
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
        role="radiogroup"
        aria-label="Muscle group"
      >
        {(['all', ...MUSCLES] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={muscle === value}
            onClick={() => setMuscle(value)}
            className={`h-9 shrink-0 rounded-full px-4 text-label font-medium transition-colors ${
              muscle === value ? 'bg-primary text-on-primary' : 'bg-card-2 text-ink-2'
            }`}
          >
            {value === 'all' ? 'All' : MUSCLE_LABEL[value]}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex items-center gap-3 rounded-[18px] bg-card-2 p-4 text-left active:scale-[0.99]"
      >
        <PlusCircle className="size-6 text-accent" />
        <span className="flex-1">
          <span className="block text-body font-semibold">Create custom exercise</span>
          <span className="text-label text-ink-2">For a movement that isn't listed</span>
        </span>
        <ChevronRight className="size-4 text-ink-3" />
      </button>

      {frequent.length > 0 && (
        <ExerciseList title="Frequently logged" items={frequent} onPick={onPick} />
      )}
      <ExerciseList
        title={muscle === 'all' ? 'All exercises' : `${MUSCLE_LABEL[muscle]} exercises`}
        items={filtered}
        onPick={onPick}
        empty={exercises ? 'No exercises match. Try another word or create a custom one.' : ''}
      />
    </div>
  )
}

function ExerciseList({
  title,
  items,
  onPick,
  empty,
}: {
  title: string
  items: Exercise[]
  onPick: (exercise: Exercise) => void
  empty?: string
}) {
  return (
    <section>
      <h3 className="mb-2 flex justify-between px-1 text-meta uppercase text-ink-3">
        {title} <span className="tnum">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="px-1 py-4 text-label text-ink-2">{empty}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[18px] bg-card-2/60">
          {items.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => onPick(exercise)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-card-2"
              >
                <span className="flex-1">
                  <span className="block text-body font-medium">{exercise.name}</span>
                  <span className="text-label text-ink-2">
                    {MUSCLE_LABEL[exercise.muscle]} · {EQUIPMENT_LABEL[exercise.equipment]}
                    {exercise.isCustom && ' · Custom'}
                  </span>
                </span>
                <Plus className="size-5 text-accent" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CreateExercise({
  initialName,
  initialMuscle,
  onCancel,
  onCreated,
}: {
  initialName: string
  initialMuscle: MuscleGroup
  onCancel: () => void
  onCreated: (exercise: Exercise) => void
}) {
  const [name, setName] = useState(initialName)
  const [muscle, setMuscle] = useState<MuscleGroup>(initialMuscle)
  const [equipment, setEquipment] = useState<Equipment>('barbell')
  const [error, setError] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the exercise a name.')
      return
    }
    onCreated(await createExercise({ name, muscle, equipment }))
  }

  const select =
    'h-12 w-full rounded-xl bg-card-2 px-3 text-body outline-none focus:ring-2 focus:ring-accent'
  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <h3 className="text-heading">New exercise</h3>
      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">Name</span>
        <input
          autoFocus
          value={name}
          maxLength={60}
          onChange={(event) => {
            setName(event.target.value)
            setError('')
          }}
          placeholder="e.g. Landmine Press"
          className={select}
          aria-invalid={Boolean(error)}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">Muscle group</span>
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
            className={select}
          >
            {MUSCLES.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">Equipment</span>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment)}
            className={select}
          >
            {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((eq) => (
              <option key={eq} value={eq}>
                {EQUIPMENT_LABEL[eq]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 flex-1 rounded-full bg-card-2 font-semibold"
        >
          Back
        </button>
        <button
          type="submit"
          className="h-12 flex-1 rounded-full bg-accent font-semibold text-on-accent"
        >
          Add exercise
        </button>
      </div>
    </form>
  )
}
