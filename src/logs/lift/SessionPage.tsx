// A workout session. Live (in progress): running timer, pause, Finish/discard. Past (finished):
// same exercise cards for corrections, plus date, delete. Every change is saved immediately.

import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  ChevronLeft,
  CheckCircle2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { Card } from '../../components/ui'
import type { WorkoutSet } from '../../data/db'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../data/exercises'
import {
  addExercise,
  addSet,
  deleteWorkout,
  discardWorkout,
  finishWorkout,
  getActiveWorkout,
  getWorkoutDetail,
  pauseWorkout,
  previousSets,
  removeExercise,
  removeSet,
  resumeWorkout,
  setExerciseNote,
  startWorkout,
  updateSet,
  updateWorkout,
  type SessionExercise,
} from '../../data/workouts'
import { dateTimeLabel, fromLocalInput, toLocalInput } from '../../lib/dates'
import { usePrefs } from '../../lib/prefs'
import { formatMass, fromKg, round1, toKg } from '../../lib/units'
import { ExercisePicker } from './ExercisePicker'
import { startRest, stopRest } from './restStore'
import { RestTimer } from './RestTimer'
import { elapsedMs, formatClock, formatMinutes, musclesWorked, summarize } from './workoutStats'

export function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workoutId, setWorkoutId] = useState<string | null>(id ?? null)

  // "/lift/workouts/session" resumes the session in progress, or starts one.
  useEffect(() => {
    if (id) return
    let cancelled = false
    void (async () => {
      const workout = (await getActiveWorkout()) ?? (await startWorkout())
      if (!cancelled) setWorkoutId(workout.id)
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const detail = useLiveQuery(
    () => (workoutId ? getWorkoutDetail(workoutId) : undefined),
    [workoutId],
  )

  if (detail === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-heading">This workout no longer exists</p>
        <Link to="/lift/workouts" className="text-label font-medium text-accent">
          Back to workouts
        </Link>
      </div>
    )
  }
  if (!detail) return null

  return <Session detail={detail} onLeave={() => navigate('/lift/workouts')} />
}

function Session({
  detail,
  onLeave,
}: {
  detail: NonNullable<Awaited<ReturnType<typeof getWorkoutDetail>>>
  onLeave: () => void
}) {
  const { workout, exercises } = detail
  const live = workout.endedAt === null
  const prefs = usePrefs()
  const [picking, setPicking] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [problem, setProblem] = useState<'empty' | 'discard' | 'delete' | null>(null)
  const now = useNow(live && !workout.pausedAt)
  const summary = summarize(detail, now)
  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0)
  const fallbackName =
    musclesWorked(detail)
      .slice(0, 2)
      .map((m) => MUSCLE_LABEL[m])
      .join(' & ') || 'Workout'

  async function finish() {
    if (await finishWorkout(workout.id)) {
      stopRest()
      onLeave()
    } else setProblem('empty')
  }

  async function discard() {
    stopRest()
    await discardWorkout(workout.id)
    onLeave()
  }

  async function remove() {
    await deleteWorkout(workout.id)
    onLeave()
  }

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {live ? (
            <p className="flex items-center gap-2 text-label text-ink-2 tnum">
              <span
                className={`size-2 rounded-full ${workout.pausedAt ? 'bg-ink-3' : 'animate-pulse bg-success'}`}
              />
              {formatClock(elapsedMs(workout, now))}
              <button
                type="button"
                onClick={() =>
                  workout.pausedAt ? resumeWorkout(workout.id) : pauseWorkout(workout.id)
                }
                className="grid size-7 place-items-center rounded-full bg-card-2 text-ink"
                aria-label={workout.pausedAt ? 'Resume timer' : 'Pause timer'}
              >
                {workout.pausedAt ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              </button>
              {workout.pausedAt && <span>Paused</span>}
            </p>
          ) : (
            <Link to="/lift/workouts" className="flex items-center gap-1 text-label text-ink-2">
              <ChevronLeft className="size-4" /> Workouts
            </Link>
          )}
          {editingName ? (
            <input
              autoFocus
              defaultValue={workout.name ?? ''}
              placeholder={fallbackName}
              maxLength={60}
              onBlur={(event) => {
                void updateWorkout(workout.id, { name: event.target.value })
                setEditingName(false)
              }}
              onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
              className="mt-1 w-full rounded-lg bg-card-2 px-2 py-1 text-title outline-none"
              aria-label="Workout name"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="mt-1 flex items-center gap-2 text-left text-title"
            >
              {workout.name ?? fallbackName}
              <Pencil className="size-4 text-ink-3" />
            </button>
          )}
        </div>
        {live ? (
          <button
            type="button"
            onClick={finish}
            className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-on-primary active:scale-95"
          >
            Finish <CheckCircle2 className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onLeave}
            className="h-11 shrink-0 rounded-full bg-primary px-5 font-semibold text-on-primary active:scale-95"
          >
            Done
          </button>
        )}
      </div>

      <Card className="grid grid-cols-3 gap-2">
        <Stat
          label={live ? 'Elapsed' : 'Duration'}
          value={live ? formatClock(summary.durationMs) : formatMinutes(summary.durationMs)}
        />
        <Stat
          label="Sets done"
          value={
            <>
              {summary.sets}
              {live && <span className="text-body text-ink-3"> / {totalSets}</span>}
            </>
          }
        />
        <Stat label="Volume" value={formatMass(summary.volumeKg, prefs.units.weight)} accent />
      </Card>

      {!live && (
        <PastDetails
          workoutId={workout.id}
          startedAt={workout.startedAt}
          endedAt={workout.endedAt!}
        />
      )}

      {problem === 'empty' && (
        <Card className="flex flex-col gap-3 border-lift/30 bg-lift/8">
          <p className="text-body">
            Complete at least one set to save this workout, or discard it.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setProblem(null)}
              className="h-10 flex-1 rounded-full bg-card font-medium"
            >
              Keep going
            </button>
            <button
              type="button"
              onClick={discard}
              className="h-10 flex-1 rounded-full bg-danger font-semibold text-white"
            >
              Discard
            </button>
          </div>
        </Card>
      )}

      {exercises.map((item) => (
        <ExerciseCard key={item.entry.id} item={item} workoutId={workout.id} live={live} />
      ))}

      <button
        type="button"
        onClick={() => setPicking(true)}
        className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-line bg-card px-4 py-6 active:scale-[0.99]"
      >
        <span className="grid size-11 place-items-center rounded-full bg-accent/12 text-accent">
          <Plus className="size-5" />
        </span>
        <span className="text-heading">Add exercise</span>
        <span className="text-label text-ink-2">From the library or your own</span>
      </button>

      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">Workout note</span>
        <textarea
          defaultValue={workout.note ?? ''}
          onBlur={(event) => updateWorkout(workout.id, { note: event.target.value })}
          rows={2}
          maxLength={1000}
          placeholder="How did it go?"
          className="resize-none rounded-xl bg-card px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      {live ? (
        problem === 'discard' ? (
          <Confirm
            text="Discard this workout? Nothing will be saved."
            action="Discard"
            onCancel={() => setProblem(null)}
            onConfirm={discard}
          />
        ) : (
          <button
            type="button"
            onClick={() => setProblem('discard')}
            className="py-2 text-label font-medium text-danger"
          >
            Discard workout
          </button>
        )
      ) : problem === 'delete' ? (
        <Confirm
          text="Delete this workout?"
          action="Delete"
          onCancel={() => setProblem(null)}
          onConfirm={remove}
        />
      ) : (
        <button
          type="button"
          onClick={() => setProblem('delete')}
          className="flex items-center justify-center gap-2 py-2 text-label font-medium text-danger"
        >
          <Trash2 className="size-4" /> Delete workout
        </button>
      )}

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        exclude={exercises.map((e) => e.exercise.id)}
        onPick={async (exercise) => {
          setPicking(false)
          await addExercise(workout.id, exercise.id)
        }}
      />
      {live && <RestTimer />}
    </div>
  )
}

function ExerciseCard({
  item,
  workoutId,
  live,
}: {
  item: SessionExercise
  workoutId: string
  live: boolean
}) {
  const { entry, exercise, sets } = item
  const prefs = usePrefs()
  const unit = prefs.units.weight
  const previous = useLiveQuery(
    () => previousSets(exercise.id, workoutId),
    [exercise.id, workoutId],
  )
  const [menu, setMenu] = useState(false)

  return (
    <Card as="article" aria-label={exercise.name} className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-heading">{exercise.name}</h2>
          <p className="flex items-center gap-1.5 text-label text-ink-2">
            <span className="size-1.5 rounded-full bg-lift" />
            {MUSCLE_LABEL[exercise.muscle]} · {EQUIPMENT_LABEL[exercise.equipment]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMenu((open) => !open)}
          className="grid size-9 place-items-center rounded-full text-ink-2 active:bg-card-2"
          aria-label={`${exercise.name} options`}
          aria-expanded={menu}
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>
      {menu && (
        <button
          type="button"
          onClick={() => removeExercise(entry.id)}
          className="flex items-center gap-2 self-start rounded-full bg-danger/10 px-3 py-1.5 text-label font-medium text-danger"
        >
          <Trash2 className="size-4" /> Remove exercise
        </button>
      )}

      <table className="w-full text-center">
        <thead>
          <tr className="text-meta uppercase text-ink-3">
            <th className="w-8 py-1 text-left font-medium">Set</th>
            <th className="py-1 text-left font-medium">Previous</th>
            <th className="w-20 py-1 font-medium">{unit}</th>
            <th className="w-16 py-1 font-medium">Reps</th>
            <th className="w-12 py-1 font-medium">
              <span className="sr-only">Done</span>
              <Check className="mx-auto size-4" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              index={index}
              previous={previous?.[index]}
              live={live}
              canRemove={sets.length > 1}
              restSeconds={prefs.restSeconds}
            />
          ))}
        </tbody>
      </table>

      <input
        defaultValue={entry.note ?? ''}
        onBlur={(event) => setExerciseNote(entry.id, event.target.value)}
        maxLength={300}
        placeholder="Note (grip, seat height…)"
        className="h-10 rounded-xl bg-card-2 px-3 text-label outline-none focus:ring-2 focus:ring-accent"
        aria-label={`${exercise.name} note`}
      />
      <button
        type="button"
        onClick={() => addSet(entry.id)}
        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-card-2 text-label font-medium active:scale-[0.99]"
      >
        <Plus className="size-4" /> Add set
      </button>
    </Card>
  )
}

function SetRow({
  set,
  index,
  previous,
  live,
  canRemove,
  restSeconds,
}: {
  set: WorkoutSet
  index: number
  previous?: WorkoutSet
  live: boolean
  canRemove: boolean
  restSeconds: number
}) {
  const unit = usePrefs().units.weight
  const show = (kg: number | null) => (kg == null ? '' : String(round1(fromKg(kg, unit))))
  const [weight, setWeight] = useState(show(set.weightKg))
  const [reps, setReps] = useState(set.reps == null ? '' : String(set.reps))

  function parsed() {
    const w = Number(weight.replace(',', '.'))
    const r = Number(reps)
    return {
      weightKg: weight.trim() && Number.isFinite(w) ? toKg(w, unit) : null,
      reps: reps.trim() && Number.isFinite(r) ? r : null,
    }
  }

  async function toggleDone() {
    const values = parsed()
    if (!set.done && !values.reps) return // need reps before ticking a set off
    await updateSet(set.id, { ...values, done: !set.done })
    if (!set.done && live) startRest(restSeconds)
  }

  const cell =
    'h-10 w-full rounded-lg bg-card-2 text-center text-body font-semibold tnum outline-none focus:ring-2 focus:ring-accent'
  return (
    <tr className={set.done ? '' : ''}>
      <td className="py-1 text-left text-label font-semibold text-ink-2 tnum">
        {canRemove && !set.done ? (
          <button
            type="button"
            onClick={() => removeSet(set.id)}
            className="rounded px-1 hover:text-danger"
            aria-label={`Remove set ${index + 1}`}
            title="Remove set"
          >
            {index + 1}
          </button>
        ) : (
          index + 1
        )}
      </td>
      <td className="py-1 text-left text-label text-ink-3 tnum">
        {previous?.reps
          ? `${previous.weightKg != null ? `${show(previous.weightKg)} × ` : ''}${previous.reps}`
          : '—'}
      </td>
      <td className="px-1 py-1">
        <input
          inputMode="decimal"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          onBlur={() => updateSet(set.id, { weightKg: parsed().weightKg })}
          className={cell}
          aria-label={`Set ${index + 1} weight in ${unit}`}
          placeholder="–"
        />
      </td>
      <td className="px-1 py-1">
        <input
          inputMode="numeric"
          value={reps}
          onChange={(event) => setReps(event.target.value.replace(/\D/g, ''))}
          onBlur={() => updateSet(set.id, { reps: parsed().reps })}
          className={cell}
          aria-label={`Set ${index + 1} reps`}
          placeholder="–"
        />
      </td>
      <td className="py-1 pl-1">
        <button
          type="button"
          onClick={toggleDone}
          aria-pressed={set.done}
          aria-label={`Set ${index + 1} done`}
          className={`grid size-10 place-items-center rounded-lg transition-colors ${
            set.done ? 'bg-success text-white' : 'bg-card-2 text-ink-3'
          }`}
        >
          <Check className="size-5" strokeWidth={2.5} />
        </button>
      </td>
    </tr>
  )
}

function PastDetails({
  workoutId,
  startedAt,
  endedAt,
}: {
  workoutId: string
  startedAt: string
  endedAt: string
}) {
  const [editing, setEditing] = useState(false)
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 self-start px-1 text-label text-ink-2"
      >
        {dateTimeLabel(startedAt)} <Pencil className="size-3.5" />
      </button>
    )
  }
  const duration = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  return (
    <label className="flex flex-col gap-2">
      <span className="px-1 text-label font-medium text-ink-2">Started</span>
      <input
        type="datetime-local"
        defaultValue={toLocalInput(startedAt)}
        onBlur={(event) => {
          if (!event.target.value) return
          const start = fromLocalInput(event.target.value)
          const end = new Date(new Date(start).getTime() + duration).toISOString()
          void updateWorkout(workoutId, { startedAt: start, endedAt: end })
          setEditing(false)
        }}
        className="h-12 rounded-xl bg-card px-4 text-body outline-none focus:ring-2 focus:ring-accent"
      />
    </label>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <div>
      <p className="text-meta uppercase text-ink-3">{label}</p>
      <p className={`mt-1 text-title tnum ${accent ? 'text-accent' : ''}`}>{value}</p>
    </div>
  )
}

function Confirm({
  text,
  action,
  onCancel,
  onConfirm,
}: {
  text: string
  action: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
      <span className="text-label">{text}</span>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onCancel} className="h-9 rounded-full px-3 text-label">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-9 rounded-full bg-danger px-4 text-label font-semibold text-white"
        >
          {action}
        </button>
      </div>
    </div>
  )
}

// Ticks every second while `running`, so the session clock moves.
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])
  return now
}
