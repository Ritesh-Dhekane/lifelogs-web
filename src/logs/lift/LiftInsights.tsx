// Lift's section on the Insights screen for one week: training and body weight.

import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, Scale } from 'lucide-react'

import { Card, LogBadge } from '../../components/ui'
import { listWeights } from '../../data/repos'
import { listWorkouts } from '../../data/workouts'
import { shortDate } from '../../lib/dates'
import { usePrefs } from '../../lib/prefs'
import { formatMass, formatShortMass, formatWeight } from '../../lib/units'
import { MUSCLE_LABEL } from '../../data/exercises'
import { getLog } from '../registry'
import { change } from './liftStats'
import { formatMinutes, musclesWorked, summarize } from './workoutStats'

export function LiftInsights({ from, to, now }: { from: Date; to: Date; now: Date }) {
  const workouts = useLiveQuery(listWorkouts)
  const weights = useLiveQuery(listWeights)
  const unit = usePrefs().units.weight
  const log = getLog('lift')
  if (!workouts || !weights) return null

  const span = to.getTime() - from.getTime()
  const inWeek = (iso: string, start = from.getTime()) => {
    const t = new Date(iso).getTime()
    return t >= start && t < start + span
  }
  const week = workouts.filter((w) => inWeek(w.workout.startedAt)).reverse()
  // For the current week, compare with the same point of last week (not the whole week).
  const partial = to.getTime() > now.getTime()
  const elapsed = partial ? now.getTime() - from.getTime() : span
  const before = workouts.filter((w) => {
    const t = new Date(w.workout.startedAt).getTime()
    return t >= from.getTime() - span && t < from.getTime() - span + elapsed
  })
  const summaries = week.map((w) => summarize(w))
  const volume = summaries.reduce((sum, s) => sum + s.volumeKg, 0)
  const previousVolume = before.reduce((sum, w) => sum + summarize(w).volumeKg, 0)
  const volumeChange = change(volume, previousVolume)
  const avgDuration = summaries.length
    ? summaries.reduce((sum, s) => sum + s.durationMs, 0) / summaries.length
    : 0
  const peak = Math.max(...summaries.map((s) => s.volumeKg), 1)

  const weekWeights = weights.filter((w) => inWeek(w.recordedAt)).reverse()
  const lastBefore = weights.find((w) => new Date(w.recordedAt).getTime() < from.getTime())
  const values = weekWeights.map((w) => w.weightKg)
  const weightChange =
    weekWeights.length && lastBefore ? weekWeights.at(-1)!.weightKg - lastBefore.weightKg : null

  return (
    <>
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <LogBadge icon={log.icon} colorClass={log.color.text} softClass={log.color.soft} />
          <div>
            <h2 className="text-heading">Training</h2>
            <p className="text-label text-ink-2">
              {week.length === 0
                ? 'No workouts this week'
                : `${week.length} ${week.length === 1 ? 'session' : 'sessions'} completed`}
            </p>
          </div>
        </div>
        {week.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-card-2 p-3">
              <div>
                <p className="text-label text-ink-2">Total volume</p>
                <p className="text-title tnum">{formatMass(volume, unit)}</p>
                {volumeChange !== null && (
                  <p
                    className={`text-label tnum ${volumeChange >= 0 ? 'text-success' : 'text-ink-2'}`}
                  >
                    {volumeChange >= 0 ? '↑' : '↓'} {Math.abs(Math.round(volumeChange * 100))}% vs{' '}
                    {partial ? 'same point last week' : 'previous week'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-label text-ink-2">Avg. session</p>
                <p className="text-title tnum">{formatMinutes(avgDuration)}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-label text-ink-2">Volume per session</p>
              <div className="flex h-32 items-end justify-center gap-3">
                {week.map((detail, i) => {
                  const muscles = musclesWorked(detail)
                    .slice(0, 1)
                    .map((m) => MUSCLE_LABEL[m])
                  return (
                    <div
                      key={detail.workout.id}
                      className="flex h-full max-w-16 flex-1 flex-col items-center justify-end gap-1"
                    >
                      <span className="text-meta text-ink-2 tnum">
                        {formatShortMass(summaries[i]!.volumeKg, unit)}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-lift/80"
                        style={{ height: `${Math.max(4, (summaries[i]!.volumeKg / peak) * 80)}%` }}
                      />
                      <span className="max-w-full truncate text-meta text-ink-3">
                        {detail.workout.name?.split(' ')[0] ?? muscles[0] ?? 'Workout'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-card-2 text-ink-2">
              <Scale className="size-5" />
            </span>
            <div>
              <h2 className="text-heading">Body weight</h2>
              <p className="text-label text-ink-2">
                {values.length === 0
                  ? 'No weigh-ins this week'
                  : `${values.length} ${values.length === 1 ? 'weigh-in' : 'weigh-ins'}`}
              </p>
            </div>
          </div>
          {weightChange !== null && Math.abs(weightChange) >= 0.05 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label font-medium tnum ${
                weightChange < 0 ? 'bg-success-soft text-success' : 'bg-lift/12 text-lift'
              }`}
            >
              {weightChange < 0 ? (
                <ArrowDown className="size-3.5" />
              ) : (
                <ArrowUp className="size-3.5" />
              )}
              {formatWeight(Math.abs(weightChange), unit)}
            </span>
          )}
        </div>
        {values.length > 0 && (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-card-2 p-3 text-center">
            <Mini
              label="Average"
              value={formatWeight(values.reduce((a, b) => a + b, 0) / values.length, unit)}
            />
            <Mini label="Lowest" value={formatWeight(Math.min(...values), unit)} />
            <Mini label="Highest" value={formatWeight(Math.max(...values), unit)} />
          </div>
        )}
        {weekWeights.length >= 2 && (
          <ol className="flex justify-between text-meta text-ink-3">
            {weekWeights.map((w) => (
              <li key={w.id} className="text-center">
                <span className="block text-label text-ink tnum">
                  {formatWeight(w.weightKg, unit, { unitLabel: false })}
                </span>
                {shortDate(w.recordedAt)}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-meta uppercase text-ink-3">{label}</p>
      <p className="mt-0.5 text-body font-semibold tnum">{value}</p>
    </div>
  )
}
