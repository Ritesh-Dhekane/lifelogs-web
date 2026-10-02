// The shared timeline: every log turns its entries into TimelineItems. A new log adds its source
// to SOURCES below.

import type { LogId } from './registry'
import { expensesTimeline } from './expenses/timeline'
import { liftTimeline } from './lift/timeline'

export interface TimelineItem {
  id: string
  log: LogId
  at: string // ISO time
  title: string
  detail?: string
  quote?: string // a note, shown quoted
  to: string // where tapping goes
  searchText: string // lower-case text the search matches against
}

const SOURCES: Partial<Record<LogId, () => Promise<TimelineItem[]>>> = {
  lift: liftTimeline,
  expenses: expensesTimeline,
}

export async function loadTimeline(logs: LogId[]): Promise<TimelineItem[]> {
  const lists = await Promise.all(logs.map((log) => SOURCES[log]?.() ?? []))
  return lists.flat().sort((a, b) => b.at.localeCompare(a.at))
}

export function filterTimeline(
  items: TimelineItem[],
  query: string,
  log: LogId | 'all',
): TimelineItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return items.filter(
    (item) =>
      (log === 'all' || item.log === log) && words.every((word) => item.searchText.includes(word)),
  )
}

// Group by local calendar day, newest day first.
export function groupByDay(items: TimelineItem[]): { day: string; items: TimelineItem[] }[] {
  const groups: { day: string; items: TimelineItem[] }[] = []
  for (const item of items) {
    const date = new Date(item.at)
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
    const last = groups.at(-1)
    if (last?.day === day) last.items.push(item)
    else groups.push({ day, items: [item] })
  }
  return groups
}
