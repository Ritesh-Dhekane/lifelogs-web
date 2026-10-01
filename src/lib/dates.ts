// Date helpers for display and for <input type="datetime-local"> (which works in local time).

const DAY = 24 * 60 * 60 * 1000

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// "Today", "Yesterday", "Sun, Oct 22" or "Oct 22, 2025".
export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const diff = Math.round((startOfDay(now) - startOfDay(date)) / DAY)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return date.toLocaleDateString('en-US', { weekday: 'long' })
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? { weekday: 'short' } : { year: 'numeric' }),
  })
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function dateTimeLabel(iso: string, now: Date = new Date()): string {
  return `${dayLabel(iso, now)}, ${timeLabel(iso)}`
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Value for <input type="datetime-local"> from an ISO timestamp, in local time.
export function toLocalInput(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString()
}

export function sameDay(a: string, b: Date): boolean {
  return startOfDay(new Date(a)) === startOfDay(b)
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
