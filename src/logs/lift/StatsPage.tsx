// Lift › Stats: tonnage, sessions, sets, streak, weekly volume, personal records, muscle balance.
// Only numbers computed from your own logs — no scores or rankings.

import { useLiveQuery } from 'dexie-react-hooks'
import {
  BarChart3,
  CalendarDays,
  Dumbbell,
  Flame,
  Layers,
  Medal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'

import { Card, EmptyState, Segmented } from '../../components/ui'
import { MUSCLE_LABEL } from '../../data/exercises'
import { listWorkouts } from '../../data/workouts'
import { shortDate } from '../../lib/dates'
import { usePrefs } from '../../lib/prefs'
import { formatMass, formatShortMass, formatWeight } from '../../lib/units'
import {
  change,
  muscleBalance,
  periodStats,
  personalRecords,
  volumeBars,
  weekStreaks,
} from './liftStats'
import type { Range } from './weightStats'

const RANGE_LABEL: Record<Range, string> = {
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
  all: 'all time',
}

export function StatsPage() {
  const workouts = useLiveQuery(listWorkouts)
  const prefs = usePrefs()
  const unit = prefs.units.weight
  const [range, setRange] = useState<Range>('30d')
  const [now] = useState(() => new Date())

  if (!workouts) return null
  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No stats yet"
        text="Finish a workout and your volume, records and streaks will show up here."
      />
    )
  }

  const inRange =
    range === 'all'
      ? workouts
      : workouts.filter(
          (w) =>
            now.getTime() - new Date(w.workout.startedAt).getTime() <=
            { '7d': 7, '30d': 30, '90d': 90 }[range] * 864e5,
        )
  const stats = periodStats(workouts, range, now)
  const tonnageChange = change(stats.current.volumeKg, stats.previous?.volumeKg)
  const streaks = weekStreaks(workouts, now, prefs.weekStart)
  const bars = volumeBars(workouts, range, now, prefs.weekStart)
  const peak = Math.max(...bars.map((b) => b.volumeKg), 1)
  const records = personalRecords(workouts).slice(0, 6)
  const balance = muscleBalance(inRange)
  const weeks = stats.days / 7

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="w-60">
          <Segmented<Range>
            size="sm"
            label="Range"
            value={range}
            onChange={setRange}
            options={[
              { value: '7d', label: '7D' },
              { value: '30d', label: '30D' },
              { value: '90d', label: '90D' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
        <span className="text-label text-ink-2">{RANGE_LABEL[range]}</span>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-label text-ink-2">
            <Dumbbell className="size-4 text-lift" /> Volume lifted
          </span>
          {tonnageChange !== null && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label font-medium tnum ${
                tonnageChange >= 0 ? 'bg-success-soft text-success' : 'bg-card-2 text-ink-2'
              }`}
            >
              {tonnageChange >= 0 ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {tonnageChange >= 0 ? '+' : ''}
              {Math.round(tonnageChange * 100)}%
            </span>
          )}
        </div>
        <p className="mt-2 text-metric tnum">{formatMass(stats.current.volumeKg, unit)}</p>
        {stats.previous && (
          <p className="mt-1 text-label text-ink-2">
            Previous {RANGE_LABEL[range].replace('last ', '')}:{' '}
            {formatMass(stats.previous.volumeKg, unit)}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <span className="flex items-center justify-between text-label text-ink-2">
            Workouts <CalendarDays className="size-4" />
          </span>
          <p className="mt-2">
            <span className="text-metric tnum">{stats.current.sessions}</span>{' '}
            <span className="text-label text-ink-2">sessions</span>
          </p>
          {weeks >= 2 && (
            <p className="mt-1 text-label text-ink-2 tnum">
              {(stats.current.sessions / weeks).toFixed(1)} per week
            </p>
          )}
        </Card>
        <Card>
          <span className="flex items-center justify-between text-label text-ink-2">
            Sets <Layers className="size-4" />
          </span>
          <p className="mt-2">
            <span className="text-metric tnum">{stats.current.sets}</span>{' '}
            <span className="text-label text-ink-2">done</span>
          </p>
          {stats.current.sessions > 0 && (
            <p className="mt-1 text-label text-ink-2 tnum">
              {(stats.current.sets / stats.current.sessions).toFixed(1)} per workout
            </p>
          )}
        </Card>
      </div>

      <Card className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-lift/12 text-lift">
          <Flame className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-meta uppercase text-ink-3">Training streak</p>
          <p className="text-heading">
            {streaks.current} {streaks.current === 1 ? 'week' : 'weeks'} in a row
          </p>
        </div>
        <p className="text-right text-label text-ink-2">
          Best
          <br />
          <strong className="text-ink tnum">
            {streaks.best} {streaks.best === 1 ? 'week' : 'weeks'}
          </strong>
        </p>
      </Card>

      <Card>
        <h2 className="text-heading">{range === '7d' ? 'Daily volume' : 'Weekly volume'}</h2>
        <div className="mt-4 flex h-40 items-end gap-2" role="img" aria-label="Volume per period">
          {bars.map((bar, i) => {
            const last = i === bars.length - 1
            return (
              <div
                key={bar.start.toISOString()}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                {bar.volumeKg > 0 && bars.length <= 7 && (
                  <span className={`text-meta tnum ${last ? 'text-accent' : 'text-ink-3'}`}>
                    {formatShortMass(bar.volumeKg, unit)}
                  </span>
                )}
                <div
                  className={`w-full rounded-t-md ${last ? 'bg-accent' : 'bg-accent/25'}`}
                  style={{
                    height: `${Math.max(bar.volumeKg ? 4 : 1, (bar.volumeKg / peak) * 82)}%`,
                  }}
                  title={`${bar.label}: ${formatMass(bar.volumeKg, unit)}`}
                />
                <span className={`text-meta ${last ? 'font-semibold text-ink' : 'text-ink-3'}`}>
                  {bars.length > 7 && i % 2 === 1 ? '' : bar.label}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {records.length > 0 && (
        <section aria-labelledby="records" className="flex flex-col gap-2">
          <h2 id="records" className="flex items-center justify-between px-1 pt-2">
            <span className="flex items-center gap-2 text-heading">
              <Medal className="size-5 text-lift" /> Personal records
            </span>
            <span className="text-label text-ink-3">Best set · all time</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {records.map((record) => (
              <li
                key={record.exerciseId}
                className="flex items-center gap-3 rounded-[18px] bg-card p-4"
              >
                <span className="grid size-10 place-items-center rounded-full bg-card-2 text-ink-2">
                  <Medal className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">{record.name}</span>
                  <span className="text-label text-ink-2 tnum">
                    Est. 1RM {formatWeight(record.oneRepMaxKg, unit)} · {shortDate(record.date)}
                  </span>
                </span>
                <span className="text-right tnum">
                  <span className="block text-body font-semibold">
                    {formatWeight(record.weightKg, unit)}
                  </span>
                  <span className="text-label text-ink-2">× {record.reps} reps</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {balance.length > 0 && (
        <Card>
          <h2 className="text-heading">Muscle balance</h2>
          <p className="text-label text-ink-2">Share of completed sets, {RANGE_LABEL[range]}</p>
          <ul className="mt-4 flex flex-col gap-3">
            {balance.map((row, i) => (
              <li key={row.muscle}>
                <div className="flex justify-between text-label">
                  <span>{MUSCLE_LABEL[row.muscle]}</span>
                  <span className="text-ink-2 tnum">
                    {Math.round(row.share * 100)}% ({row.sets} sets)
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-card-2">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${row.share * 100}%`, opacity: 1 - i * 0.12 }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
