// Lift › Weight: current weight, trend, target progress and history.

import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, Clock, Plus, Scale } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { TrendChart } from '../../components/TrendChart'
import { Card, EmptyState, Segmented } from '../../components/ui'
import type { WeightEntry } from '../../data/db'
import { getProfile, listWeights } from '../../data/repos'
import { dateTimeLabel, shortDate } from '../../lib/dates'
import { usePrefs } from '../../lib/prefs'
import { formatWeight, fromKg, round1 } from '../../lib/units'
import { KIND_LABEL } from './labels'
import { WeightSheet } from './WeightSheet'
import { inRange, targetProgress, weeklyChange, type Range } from './weightStats'

const PAGE = 30

export function WeightPage() {
  const weights = useLiveQuery(listWeights)
  const profile = useLiveQuery(getProfile)
  const { units } = usePrefs()
  const unit = units.weight
  const [params, setParams] = useSearchParams()
  const [range, setRange] = useState<Range>('30d')
  const [editing, setEditing] = useState<WeightEntry | null>(null)
  const [shown, setShown] = useState(PAGE)
  const adding = params.get('add') === '1'

  const [now] = useState(() => new Date())

  if (!weights) return null // first read from the database is near-instant

  const latest = weights[0]
  const change = weeklyChange(weights)
  const target = profile?.targetWeightKg ?? null
  const progress = targetProgress(weights, target)
  const series = inRange(weights, range, now)

  function openAdd() {
    setParams({ add: '1' }, { replace: true })
  }
  function closeSheet() {
    setEditing(null)
    if (adding) setParams({}, { replace: true })
  }

  return (
    <div className="flex flex-col gap-4">
      {latest ? (
        <>
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-label text-ink-2">
              <span>Current weight</span>
              <span>{dateTimeLabel(latest.recordedAt)}</span>
            </div>
            <p className="flex items-baseline gap-2">
              <span className="text-[48px] leading-none font-bold tracking-tight tnum">
                {formatWeight(latest.weightKg, unit, { unitLabel: false })}
              </span>
              <span className="text-title text-ink-2">{unit}</span>
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {change === null ? (
                <span className="text-label text-ink-3">Log for a week to see your change</span>
              ) : change === 0 ? (
                <span className="rounded-full bg-card-2 px-2.5 py-1 text-label font-medium text-ink-2">
                  No change vs last week
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label font-medium tnum ${
                    change < 0 ? 'bg-success-soft text-success' : 'bg-lift/12 text-lift'
                  }`}
                >
                  {change < 0 ? (
                    <ArrowDown className="size-3.5" />
                  ) : (
                    <ArrowUp className="size-3.5" />
                  )}
                  {formatWeight(Math.abs(change), unit)} vs last week
                </span>
              )}
              {target != null ? (
                <span className="text-label text-ink-2">
                  Target: <strong className="text-ink tnum">{formatWeight(target, unit)}</strong>
                </span>
              ) : (
                <Link to="/profile" className="text-label font-medium text-accent">
                  Set a target
                </Link>
              )}
            </div>
            {progress !== null && (
              <div
                className="h-2 overflow-hidden rounded-full bg-card-2"
                role="progressbar"
                aria-label="Progress towards target weight"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-700"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-heading">Trend</h2>
              <div className="w-52">
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
            </div>
            {series.length >= 2 ? (
              <div className="pt-6 text-lift">
                <TrendChart
                  ariaLabel={`Weight over ${range === 'all' ? 'all time' : range.replace('d', ' days')}`}
                  points={series.map((entry) => ({
                    t: new Date(entry.recordedAt).getTime(),
                    v: fromKg(entry.weightKg, unit),
                    label: `${shortDate(entry.recordedAt)} · ${formatWeight(entry.weightKg, unit)}`,
                  }))}
                  goal={target != null ? fromKg(target, unit) : null}
                  formatValue={(v) => `${round1(v)}`}
                  formatDate={(t) => shortDate(new Date(t).toISOString())}
                />
              </div>
            ) : (
              <p className="py-8 text-center text-label text-ink-2">
                {series.length === 1
                  ? 'One entry in this range — log another to see a trend.'
                  : 'No entries in this range.'}
              </p>
            )}
          </Card>

          <section aria-labelledby="weight-history" className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1 pt-2">
              <h2 id="weight-history" className="text-heading">
                History
              </h2>
              <span className="rounded-full bg-card-2 px-2 py-0.5 text-label text-ink-2 tnum">
                {weights.length} {weights.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {weights.slice(0, shown).map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(entry)}
                    className="flex w-full flex-col gap-1 rounded-[18px] bg-card p-4 text-left transition-colors active:bg-card-2"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className="text-heading tnum">
                          {formatWeight(entry.weightKg, unit)}
                        </span>
                        <KindBadge entry={entry} />
                      </span>
                      <span className="text-label text-ink-2">
                        {dateTimeLabel(entry.recordedAt)}
                      </span>
                    </span>
                    {entry.note && (
                      <span className="truncate text-label text-ink-2">{entry.note}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {weights.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="mx-auto mt-1 flex h-10 items-center gap-2 rounded-full bg-card px-4 text-label font-medium"
              >
                <Clock className="size-4" /> Show older entries
              </button>
            )}
          </section>
        </>
      ) : (
        <EmptyState
          icon={Scale}
          title="No weigh-ins yet"
          text="Log your weight to start a trend. Before or after the gym — your choice."
          action={
            <button
              type="button"
              onClick={openAdd}
              className="h-11 rounded-full bg-accent px-5 font-semibold text-white"
            >
              Log weight
            </button>
          }
        />
      )}

      {latest && (
        <button
          type="button"
          onClick={openAdd}
          className="fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white shadow-float active:scale-95 lg:bottom-8"
        >
          <Plus className="size-5" /> Add weight
        </button>
      )}

      <WeightSheet
        open={adding || editing !== null}
        onClose={closeSheet}
        entry={editing}
        lastKg={latest?.weightKg ?? null}
      />
    </div>
  )
}

function KindBadge({ entry }: { entry: WeightEntry }) {
  const tone =
    entry.kind === 'before_gym'
      ? 'bg-accent/12 text-accent'
      : entry.kind === 'after_gym'
        ? 'bg-lift/12 text-lift'
        : 'bg-card-2 text-ink-2'
  return (
    <span className={`rounded-md px-2 py-0.5 text-label ${tone}`}>{KIND_LABEL[entry.kind]}</span>
  )
}
