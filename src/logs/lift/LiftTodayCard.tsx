// Lift's card on the Today screen: latest weight with a 30-day line, and today's workout.

import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Play, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Card, LogBadge } from '../../components/ui'
import { getProfile, listWeights } from '../../data/repos'
import { getActiveWorkout, listWorkouts } from '../../data/workouts'
import { dateTimeLabel, sameDay } from '../../lib/dates'
import { usePrefs } from '../../lib/prefs'
import { formatMass, formatWeight } from '../../lib/units'
import { getLog } from '../registry'
import { MUSCLE_LABEL } from '../../data/exercises'
import { inRange, weeklyChange } from './weightStats'
import { formatMinutes, musclesWorked, summarize } from './workoutStats'

export function LiftTodayCard() {
  const weights = useLiveQuery(listWeights)
  const workouts = useLiveQuery(listWorkouts)
  const active = useLiveQuery(getActiveWorkout)
  const profile = useLiveQuery(getProfile)
  const unit = usePrefs().units.weight
  const [now] = useState(() => new Date())
  const log = getLog('lift')

  if (!weights || !workouts)
    return (
      <Card className="h-56 animate-pulse" aria-label="Lift">
        {null}
      </Card>
    )

  const latest = weights[0]
  const change = weeklyChange(weights)
  const line = inRange(weights, '30d', now)
  const today = workouts.filter((w) => sameDay(w.workout.startedAt, now))

  return (
    <Card aria-label="Lift" className="flex flex-col gap-4">
      <Link to="/lift" className="flex items-center gap-3">
        <LogBadge icon={log.icon} colorClass={log.color.text} softClass={log.color.soft} />
        <span className="flex-1">
          <span className="block text-heading">Lift</span>
          <span className="text-label text-ink-2">
            {latest
              ? `Weighed ${dateTimeLabel(latest.recordedAt).toLowerCase()}`
              : 'Weight and workouts'}
          </span>
        </span>
        <ChevronRight className="size-5 text-ink-3" />
      </Link>

      {latest ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-3">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[40px] leading-none font-bold tracking-tight tnum">
                {formatWeight(latest.weightKg, unit, { unitLabel: false })}
              </span>
              <span className="text-body text-ink-2">{unit}</span>
            </p>
            {change !== null && change !== 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label font-medium tnum ${
                  change < 0 ? 'bg-success-soft text-success' : 'bg-lift/12 text-lift'
                }`}
              >
                {change < 0 ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
                {formatWeight(Math.abs(change), unit)} this week
              </span>
            )}
          </div>
          {line.length >= 2 && (
            <MiniLine values={line.map((e) => e.weightKg)} goal={profile?.targetWeightKg ?? null} />
          )}
        </div>
      ) : (
        <Link
          to="/lift/weight?add=1"
          className="flex items-center justify-center gap-2 rounded-xl bg-card-2 py-3 text-label font-medium"
        >
          <Plus className="size-4" /> Log your first weigh-in
        </Link>
      )}

      {active ? (
        <Link
          to="/lift/workouts/session"
          className="flex items-center gap-3 rounded-xl bg-lift/10 p-3 ring-1 ring-lift/25"
        >
          <span className="grid size-9 place-items-center rounded-full bg-lift text-white">
            <Play className="size-4" />
          </span>
          <span className="flex-1 text-body font-semibold">Workout in progress</span>
          <span className="text-label font-medium text-lift">Resume</span>
        </Link>
      ) : today.length > 0 ? (
        today.map((detail) => {
          const summary = summarize(detail)
          const muscles = musclesWorked(detail)
            .slice(0, 2)
            .map((m) => MUSCLE_LABEL[m])
          return (
            <Link
              key={detail.workout.id}
              to={`/lift/workouts/${detail.workout.id}`}
              className="flex items-center gap-3 rounded-xl bg-card-2 p-3"
            >
              <CheckCircle2 className="size-7 shrink-0 text-success" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">
                  {detail.workout.name ?? (muscles.join(' & ') || 'Workout')}
                </span>
                <span className="text-label text-ink-2 tnum">
                  {formatMinutes(summary.durationMs)} · {summary.sets} sets ·{' '}
                  {formatMass(summary.volumeKg, unit)}
                </span>
              </span>
              <span className="rounded-full bg-card px-2.5 py-1 text-label text-ink-2">Done</span>
            </Link>
          )
        })
      ) : (
        <Link
          to="/lift/workouts/session"
          className="flex items-center gap-3 rounded-xl bg-card-2 p-3"
        >
          <span className="grid size-9 place-items-center rounded-full bg-accent text-white">
            <Plus className="size-4" />
          </span>
          <span className="flex-1">
            <span className="block text-body font-semibold">No workout yet today</span>
            <span className="text-label text-ink-2">Start one when you're ready</span>
          </span>
          <ChevronRight className="size-5 text-ink-3" />
        </Link>
      )}
    </Card>
  )
}

// Tiny trend line for the card (no axes).
function MiniLine({ values, goal }: { values: number[]; goal: number | null }) {
  const W = 300
  const H = 56
  const all = goal != null ? [...values, goal] : values
  let min = Math.min(...all)
  let max = Math.max(...all)
  if (max - min < 0.5) {
    min -= 0.25
    max += 0.25
  }
  const x = (i: number) => (i / (values.length - 1)) * (W - 8) + 4
  const y = (v: number) => 6 + (1 - (v - min) / (max - min)) * (H - 12)
  const path = values
    .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full text-lift" aria-hidden="true">
      {goal != null && (
        <line
          x1={0}
          x2={W}
          y1={y(goal)}
          y2={y(goal)}
          className="stroke-ink-3"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
      )}
      <path
        d={`${path} L${x(values.length - 1)},${H} L${x(0)},${H} Z`}
        fill="currentColor"
        opacity={0.1}
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(values.at(-1)!)}
        r={3.5}
        className="fill-card"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}
