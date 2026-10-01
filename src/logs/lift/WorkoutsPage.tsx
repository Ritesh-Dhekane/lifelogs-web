// Lift › Workouts: past sessions and the way into a new (or the current) one.

import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Clock, Dumbbell, Layers, Play, Plus, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Card, EmptyState } from '../../components/ui'
import { MUSCLE_LABEL } from '../../data/exercises'
import { getActiveWorkout, listWorkouts, type WorkoutDetail } from '../../data/workouts'
import { dayLabel } from '../../lib/dates'
import { usePrefs } from '../../lib/prefs'
import { formatMass } from '../../lib/units'
import { formatMinutes, musclesWorked, summarize } from './workoutStats'

export function WorkoutsPage() {
  const workouts = useLiveQuery(listWorkouts)
  const active = useLiveQuery(getActiveWorkout)
  const [now] = useState(() => new Date())

  if (!workouts) return null
  const thisMonth = workouts.filter((w) => {
    const date = new Date(w.workout.startedAt)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="flex flex-col gap-4 pb-16">
      {active && (
        <Link
          to="/lift/workouts/session"
          className="flex items-center gap-3 rounded-[18px] bg-lift/10 p-4 ring-1 ring-lift/25"
        >
          <span className="grid size-10 place-items-center rounded-full bg-lift text-white">
            <Play className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-meta uppercase text-lift">In progress</span>
            <span className="text-heading">Resume your workout</span>
          </span>
          <ChevronRight className="size-5 text-ink-3" />
        </Link>
      )}

      {workouts.length > 0 ? (
        <>
          <Card className="flex items-center justify-between bg-card-2/60">
            <div>
              <p className="text-meta uppercase text-ink-3">
                {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              <p className="mt-1">
                <span className="text-metric tnum">{thisMonth}</span>{' '}
                <span className="text-body text-ink-2">
                  {thisMonth === 1 ? 'workout' : 'workouts'} logged
                </span>
              </p>
            </div>
            <span className="text-label text-ink-2 tnum">{workouts.length} total</span>
          </Card>
          <ul className="flex flex-col gap-3">
            {workouts.map((detail) => (
              <WorkoutCard key={detail.workout.id} detail={detail} />
            ))}
          </ul>
        </>
      ) : (
        !active && (
          <EmptyState
            icon={Dumbbell}
            title="No workouts yet"
            text="Start a session, add exercises and tick off sets as you go. Your numbers carry over next time."
          />
        )
      )}

      {!active && (
        <Link
          to="/lift/workouts/session"
          className="fixed inset-x-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 mx-auto flex h-13 max-w-md items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-semibold text-white shadow-float active:scale-[0.98] lg:bottom-8 lg:left-[calc(16rem+1rem)]"
        >
          <Plus className="size-5" /> Start workout
        </Link>
      )}
    </div>
  )
}

function WorkoutCard({ detail }: { detail: WorkoutDetail }) {
  const unit = usePrefs().units.weight
  const summary = summarize(detail)
  const muscles = musclesWorked(detail)
  const name =
    detail.workout.name ??
    (muscles
      .slice(0, 2)
      .map((m) => MUSCLE_LABEL[m])
      .join(' & ') ||
      'Workout')

  return (
    <li>
      <Link
        to={`/lift/workouts/${detail.workout.id}`}
        className="flex flex-col gap-3 rounded-[18px] border border-hairline bg-card p-4 active:bg-card-2"
      >
        <span className="flex items-start justify-between gap-2">
          <span>
            <span className="block text-label text-ink-2">
              {dayLabel(detail.workout.startedAt)}
            </span>
            <span className="text-title">{name}</span>
          </span>
          <ChevronRight className="mt-1 size-5 text-ink-3" />
        </span>
        <span className="flex flex-wrap gap-2">
          <Pill icon={Clock}>{formatMinutes(summary.durationMs)}</Pill>
          <Pill icon={Layers}>{summary.sets} sets</Pill>
          <Pill icon={Zap}>{formatMass(summary.volumeKg, unit)}</Pill>
        </span>
        {muscles.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {muscles.map((m) => (
              <span key={m} className="rounded-md bg-card-2 px-2 py-0.5 text-label text-ink-2">
                {MUSCLE_LABEL[m]}
              </span>
            ))}
          </span>
        )}
        <span className="flex flex-col gap-1 border-t border-line pt-3">
          {detail.exercises.slice(0, 4).map(({ entry, exercise, sets }) => (
            <span key={entry.id} className="flex justify-between text-body">
              <span className="truncate">{exercise.name}</span>
              <span className="shrink-0 text-label text-ink-2 tnum">
                {sets.length} {sets.length === 1 ? 'set' : 'sets'}
              </span>
            </span>
          ))}
          {detail.exercises.length > 4 && (
            <span className="text-label text-ink-3">+{detail.exercises.length - 4} more</span>
          )}
        </span>
      </Link>
    </li>
  )
}

function Pill({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card-2 px-2.5 py-1 text-label font-medium tnum">
      <Icon className="size-3.5 text-ink-2" /> {children}
    </span>
  )
}
