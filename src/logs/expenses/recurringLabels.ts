// Words for recurring items: "Monthly on the 5th", "Due tomorrow".

import type { Recurring } from '../../data/db'
import { fromDay } from '../../data/recurring'

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

export function cadenceLabel(item: Pick<Recurring, 'cadence' | 'startOn'>): string {
  const start = fromDay(item.startOn)
  if (item.cadence === 'weekly') {
    return `Weekly on ${start.toLocaleDateString('en-US', { weekday: 'long' })}`
  }
  if (item.cadence === 'monthly') return `Monthly on the ${ordinal(start.getDate())}`
  return `Yearly on ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function dueLabel(day: string, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const days = Math.round((fromDay(day).getTime() - today) / 864e5)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days < 7) return `In ${days} days`
  return fromDay(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
