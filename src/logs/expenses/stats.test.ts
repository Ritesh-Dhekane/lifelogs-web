import { describe, expect, it } from 'vitest'

import type { Expense, ExpenseCategory } from '../../data/db'
import {
  addMonths,
  budgetStatus,
  byCategory,
  byDay,
  inMonth,
  monthKey,
  monthlyTotals,
  total,
} from './stats'

const expense = (spentAt: string, amountMinor: number, categoryId: string): Expense => ({
  id: `${spentAt}-${categoryId}`,
  spentAt,
  amountMinor,
  categoryId,
  paidWith: null,
  note: null,
  recurringId: null,
  linkedTo: null,
  createdAt: spentAt,
  updatedAt: spentAt,
  deletedAt: null,
})

// Local-time timestamps so month and day boundaries don't depend on the test machine's zone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()

const list = [
  expense(at(2026, 10, 2, 20), 30000, 'cat-food'),
  expense(at(2026, 10, 2, 9), 10000, 'cat-transport'),
  expense(at(2026, 10, 1), 60000, 'cat-food'),
  expense(at(2026, 9, 30), 99900, 'cat-shopping'),
  expense(at(2026, 8, 15), 50000, 'cat-food'),
]

describe('expense stats', () => {
  it('works in local months', () => {
    expect(monthKey(new Date(2026, 9, 2))).toBe('2026-10')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(total(inMonth(list, '2026-10'))).toBe(100000)
  })

  it('breaks a month down by category, biggest first', () => {
    const parts = byCategory(inMonth(list, '2026-10'))
    expect(parts.map((p) => [p.categoryId, p.amountMinor, p.count])).toEqual([
      ['cat-food', 90000, 2],
      ['cat-transport', 10000, 1],
    ])
    expect(parts[0]!.share).toBeCloseTo(0.9)
  })

  it('groups by day with day totals', () => {
    const days = byDay(inMonth(list, '2026-10'))
    expect(days.map((d) => d.totalMinor)).toEqual([40000, 60000])
  })

  it('totals the last months, including empty ones', () => {
    expect(monthlyTotals(list, '2026-10', 3)).toEqual([
      { month: '2026-08', totalMinor: 50000 },
      { month: '2026-09', totalMinor: 99900 },
      { month: '2026-10', totalMinor: 100000 },
    ])
  })

  it('reports budget use and overspend', () => {
    const categories = [
      { id: 'cat-food', budgetMinor: 80000 },
      { id: 'cat-transport', budgetMinor: 50000 },
      { id: 'cat-shopping', budgetMinor: null },
    ] as ExpenseCategory[]
    const status = budgetStatus(list, categories, '2026-10')
    expect(status.map((s) => [s.category.id, s.spentMinor, s.over])).toEqual([
      ['cat-food', 90000, true],
      ['cat-transport', 10000, false],
    ])
  })
})
