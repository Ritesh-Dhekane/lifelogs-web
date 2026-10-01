import { describe, expect, it } from 'vitest'

import { loggingStreak } from './streak'

const NOW = new Date(2026, 9, 10, 20) // Oct 10, 8 pm local
const day = (d: number, h = 9) => new Date(2026, 9, d, h).toISOString()

describe('loggingStreak', () => {
  it('counts back from today', () => {
    expect(loggingStreak([day(10), day(9), day(9, 18), day(8), day(6)], NOW)).toBe(3)
  })

  it('keeps yesterday’s streak alive until today is over', () => {
    expect(loggingStreak([day(9), day(8)], NOW)).toBe(2)
  })

  it('is zero after a missed day', () => {
    expect(loggingStreak([day(8), day(7)], NOW)).toBe(0)
    expect(loggingStreak([], NOW)).toBe(0)
  })
})
