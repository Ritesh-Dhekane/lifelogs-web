// Timeline: everything logged, newest first, grouped by day — with search and per-log filters.

import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarSearch, ChevronRight, Clock, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { EmptyState, LogBadge } from '../components/ui'
import { dayLabel, timeLabel } from '../lib/dates'
import { usePrefs } from '../lib/prefs'
import { enabledLogs, getLog, type LogId } from '../logs/registry'
import { filterTimeline, groupByDay, loadTimeline } from '../logs/timeline'

const PAGE_DAYS = 30

export function TimelinePage() {
  const prefs = usePrefs()
  const logs = enabledLogs(prefs)
  const logIds = logs.map((log) => log.id).join(',')
  const items = useLiveQuery(
    () => loadTimeline(logIds ? (logIds.split(',') as LogId[]) : []),
    [logIds],
  )
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LogId | 'all'>('all')
  const [days, setDays] = useState(PAGE_DAYS)

  const groups = useMemo(
    () => (items ? groupByDay(filterTimeline(items, query, filter)) : []),
    [items, query, filter],
  )

  function jumpTo(value: string) {
    if (!value) return
    const target = new Date(`${value}T00:00:00`).getTime()
    const index = groups.findIndex((g) => new Date(g.day).getTime() <= target)
    if (index === -1) return
    if (index >= days) setDays(index + PAGE_DAYS)
    requestAnimationFrame(() =>
      document
        .getElementById(`day-${index}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  if (!items) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-full bg-card px-4">
          <Search className="size-4 text-ink-3" />
          <span className="sr-only">Search the timeline</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises, notes…"
            className="min-w-0 flex-1 bg-transparent text-body outline-none"
          />
        </label>
        <label className="relative flex h-11 items-center gap-2 rounded-full bg-card px-4 text-label font-medium">
          <CalendarSearch className="size-4" /> Jump
          <input
            type="date"
            onChange={(event) => jumpTo(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Jump to date"
          />
        </label>
      </div>

      {logs.length > 1 && (
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4"
          role="radiogroup"
          aria-label="Filter by log"
        >
          {[{ id: 'all' as const, name: 'All logs' }, ...logs].map((log) => (
            <button
              key={log.id}
              type="button"
              role="radio"
              aria-checked={filter === log.id}
              onClick={() => setFilter(log.id)}
              className={`h-9 shrink-0 rounded-full px-4 text-label font-medium ${
                filter === log.id ? 'bg-primary text-on-primary' : 'bg-card text-ink-2'
              }`}
            >
              {log.name}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={items.length ? 'Nothing matches' : 'Nothing logged yet'}
          text={
            items.length
              ? 'Try another word or clear the search.'
              : 'Weigh-ins and workouts will appear here, day by day.'
          }
        />
      ) : (
        groups.slice(0, days).map((group, index) => (
          <section
            key={group.day}
            id={`day-${index}`}
            aria-labelledby={`day-${index}-title`}
            className="scroll-mt-20"
          >
            <h2 id={`day-${index}-title`} className="mb-2 flex items-baseline justify-between px-1">
              <span className="text-title">{dayLabel(group.day)}</span>
              <span className="rounded-full bg-card-2 px-2 py-0.5 text-label text-ink-2 tnum">
                {group.items.length} {group.items.length === 1 ? 'log' : 'logs'}
              </span>
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-[18px] bg-card">
              {group.items.map((item) => {
                const log = getLog(item.log)
                return (
                  <li key={item.id}>
                    <Link to={item.to} className="flex items-start gap-3 p-4 active:bg-card-2">
                      <LogBadge
                        icon={log.icon}
                        colorClass={log.color.text}
                        softClass={log.color.soft}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-body font-semibold">{item.title}</span>
                          <span className="shrink-0 text-label text-ink-2">
                            {timeLabel(item.at)}
                          </span>
                        </span>
                        {item.detail && (
                          <span className="block text-label text-ink-2 tnum">{item.detail}</span>
                        )}
                        {item.quote && (
                          <span className="mt-2 block rounded-lg bg-card-2 px-3 py-1.5 text-label text-ink-2 italic">
                            “{item.quote}”
                          </span>
                        )}
                      </span>
                      <ChevronRight className="mt-1 size-4 shrink-0 text-ink-3" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      {groups.length > days && (
        <button
          type="button"
          onClick={() => setDays((d) => d + PAGE_DAYS)}
          className="mx-auto flex h-10 items-center gap-2 rounded-full bg-card px-4 text-label font-medium"
        >
          Show earlier days
        </button>
      )}
      {groups.length > 0 && groups.length <= days && (
        <p className="py-4 text-center text-label text-ink-3">That's everything you've logged.</p>
      )}
    </div>
  )
}
