// Calendar days as local "YYYY-MM-DD" strings (they sort and compare in date order).

export function toDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function addDays(day: string, days: number): string {
  const date = fromDay(day)
  return toDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

export function addMonthsToDay(day: string, months: number): string {
  const date = fromDay(day)
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return toDay(new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), last)))
}

// Whole days from `from` to `to` (negative when `to` is earlier).
export function daysBetween(from: string, to: string): number {
  return Math.round((fromDay(to).getTime() - fromDay(from).getTime()) / 864e5)
}

// "Today", "Tomorrow", "In 5 days", "3 days ago", "Mar 12, 2027".
export function relativeDay(day: string, today: string): string {
  const diff = daysBetween(today, day)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 14) return `In ${diff} days`
  if (diff < -1 && diff > -14) return `${-diff} days ago`
  const date = fromDay(day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === fromDay(today).getFullYear() ? {} : { year: 'numeric' }),
  })
}
