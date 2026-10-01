// Days in a row (ending today, or yesterday if nothing is logged yet today) with at least one
// entry in any log. Dates are ISO timestamps, compared in local time.

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function loggingStreak(timestamps: string[], now: Date): number {
  const days = new Set(timestamps.map((iso) => dayKey(new Date(iso))))
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
