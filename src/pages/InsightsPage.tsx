// Insights: one week at a time, a section per enabled log.

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type ComponentType } from 'react'

import { usePrefs } from '../lib/prefs'
import { LiftInsights } from '../logs/lift/LiftInsights'
import { weekStart } from '../logs/lift/liftStats'
import { enabledLogs, type LogId } from '../logs/registry'

// Each log's weekly section. A new log adds its component here.
const SECTIONS: Partial<Record<LogId, ComponentType<{ from: Date; to: Date; now: Date }>>> = {
  lift: LiftInsights,
}

export function InsightsPage() {
  const prefs = usePrefs()
  const [now] = useState(() => new Date())
  const [offset, setOffset] = useState(0) // 0 = this week, -1 = last week…
  const thisWeek = weekStart(now, prefs.weekStart)
  const from = new Date(
    thisWeek.getFullYear(),
    thisWeek.getMonth(),
    thisWeek.getDate() + offset * 7,
  )
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7)
  const last = new Date(to.getTime() - 1)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-full bg-card p-1">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          className="grid size-10 place-items-center rounded-full active:bg-card-2"
          aria-label="Previous week"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="flex items-center gap-2 text-body font-semibold" aria-live="polite">
          {fmt(from)} – {fmt(last)}
          {offset === 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-meta text-white uppercase">
              This week
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset === 0}
          className="grid size-10 place-items-center rounded-full active:bg-card-2 disabled:opacity-30"
          aria-label="Next week"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {enabledLogs(prefs).map((log) => {
        const Section = SECTIONS[log.id]
        return Section ? <Section key={log.id} from={from} to={to} now={now} /> : null
      })}
    </div>
  )
}
