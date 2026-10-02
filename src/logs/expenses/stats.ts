// Pure calculations for Expenses: months, totals, category breakdowns and budgets.

import type { Expense, ExpenseCategory } from '../../data/db'

// "2026-10" for the local month of a date.
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthStart(key: string): Date {
  const [y, m] = key.split('-').map(Number)
  return new Date(y!, m! - 1, 1)
}

export function addMonths(key: string, delta: number): string {
  const start = monthStart(key)
  return monthKey(new Date(start.getFullYear(), start.getMonth() + delta, 1))
}

export function monthLabel(key: string, now: Date = new Date()): string {
  const start = monthStart(key)
  return start.toLocaleDateString('en-US', {
    month: 'long',
    ...(start.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

export function inMonth(expenses: Expense[], key: string): Expense[] {
  return expenses.filter((e) => monthKey(new Date(e.spentAt)) === key)
}

export function inRange(expenses: Expense[], from: Date, to: Date): Expense[] {
  const a = from.getTime()
  const b = to.getTime()
  return expenses.filter((e) => {
    const t = new Date(e.spentAt).getTime()
    return t >= a && t < b
  })
}

export function total(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountMinor, 0)
}

export interface CategoryTotal {
  categoryId: string
  amountMinor: number
  count: number
  share: number // 0..1 of the month's total
}

// Biggest first.
export function byCategory(expenses: Expense[]): CategoryTotal[] {
  const sums = new Map<string, { amountMinor: number; count: number }>()
  for (const e of expenses) {
    const current = sums.get(e.categoryId) ?? { amountMinor: 0, count: 0 }
    current.amountMinor += e.amountMinor
    current.count += 1
    sums.set(e.categoryId, current)
  }
  const all = total(expenses)
  return [...sums.entries()]
    .map(([categoryId, s]) => ({ categoryId, ...s, share: all ? s.amountMinor / all : 0 }))
    .sort((a, b) => b.amountMinor - a.amountMinor)
}

// Newest day first; each day's entries newest first (the input is already newest first).
export function byDay(
  expenses: Expense[],
): { day: string; totalMinor: number; items: Expense[] }[] {
  const groups: { day: string; totalMinor: number; items: Expense[] }[] = []
  for (const e of expenses) {
    const d = new Date(e.spentAt)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
    const last = groups.at(-1)
    if (last?.day === day) {
      last.items.push(e)
      last.totalMinor += e.amountMinor
    } else groups.push({ day, totalMinor: e.amountMinor, items: [e] })
  }
  return groups
}

// Totals for the last `count` months ending with `key`, oldest first.
export function monthlyTotals(expenses: Expense[], key: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const month = addMonths(key, i - count + 1)
    return { month, totalMinor: total(inMonth(expenses, month)) }
  })
}

export interface BudgetStatus {
  category: ExpenseCategory
  spentMinor: number
  budgetMinor: number
  share: number // spent / budget (can be > 1)
  over: boolean
}

export function budgetStatus(expenses: Expense[], categories: ExpenseCategory[], key: string) {
  const sums = new Map(byCategory(inMonth(expenses, key)).map((c) => [c.categoryId, c.amountMinor]))
  return categories
    .filter((c) => c.budgetMinor)
    .map((category): BudgetStatus => {
      const spentMinor = sums.get(category.id) ?? 0
      const budgetMinor = category.budgetMinor!
      return {
        category,
        spentMinor,
        budgetMinor,
        share: spentMinor / budgetMinor,
        over: spentMinor > budgetMinor,
      }
    })
}

// How far through a month a day is (for "on track" hints): Oct 15 of 31 days → ~0.48.
export function monthElapsed(key: string, now: Date): number {
  const start = monthStart(key)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  if (now < start) return 0
  if (now >= end) return 1
  return (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())
}
