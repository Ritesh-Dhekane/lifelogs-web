import type { WeightEntry } from '../../../data/db'

export const DAY = 864e5

// The weigh-in nearest to a moment, if one is within 3 days.
export function nearestWeight(weights: WeightEntry[], at: string): WeightEntry | null {
  const t = new Date(at).getTime()
  let best: WeightEntry | null = null
  for (const w of weights) {
    const d = Math.abs(new Date(w.recordedAt).getTime() - t)
    if (d <= 3 * DAY && (!best || d < Math.abs(new Date(best.recordedAt).getTime() - t))) best = w
  }
  return best
}
