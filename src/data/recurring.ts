// Recurring bills and subscriptions. Each has a start date and a cadence; due dates are always
// counted from the start date, so a bill on the 31st is due on Feb 28 and back on Mar 31.
// Items with auto-log on add an expense on each due date — including ones missed while the app
// wasn't opened — exactly once.

import { fromDay, toDay } from '../lib/days'
import { db, newId, nowIso, type Cadence, type Recurring } from './db'

// ---------- Dates ----------

export { fromDay, toDay } from '../lib/days'

// The n-th due date (n = 0 is the start date).
export function occurrence(startOn: string, cadence: Cadence, n: number): string {
  const start = fromDay(startOn)
  if (cadence === 'weekly') {
    return toDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * n))
  }
  const months = cadence === 'monthly' ? n : 12 * n
  const first = new Date(start.getFullYear(), start.getMonth() + months, 1)
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return toDay(new Date(first.getFullYear(), first.getMonth(), Math.min(start.getDate(), lastDay)))
}

// The first due date on or after `day` ("YYYY-MM-DD" strings compare in date order).
export function firstOnOrAfter(startOn: string, cadence: Cadence, day: string): string {
  if (startOn >= day) return startOn
  // Jump close, then step: weekly ≈ 7 days, monthly ≈ 30.4, yearly ≈ 365.25.
  const days = (fromDay(day).getTime() - fromDay(startOn).getTime()) / 864e5
  const per = cadence === 'weekly' ? 7 : cadence === 'monthly' ? 30.44 : 365.25
  let n = Math.max(0, Math.floor(days / per) - 1)
  while (occurrence(startOn, cadence, n) < day) n++
  return occurrence(startOn, cadence, n)
}

function nextAfter(item: Pick<Recurring, 'startOn' | 'cadence'>, day: string): string {
  const next = new Date(fromDay(day).getTime())
  next.setDate(next.getDate() + 1)
  return firstOnOrAfter(item.startOn, item.cadence, toDay(next))
}

// ---------- Costs ----------

export function monthlyCost(item: Pick<Recurring, 'amountMinor' | 'cadence'>): number {
  if (item.cadence === 'weekly') return Math.round((item.amountMinor * 52) / 12)
  if (item.cadence === 'yearly') return Math.round(item.amountMinor / 12)
  return item.amountMinor
}

export function yearlyCost(item: Pick<Recurring, 'amountMinor' | 'cadence'>): number {
  if (item.cadence === 'weekly') return item.amountMinor * 52
  if (item.cadence === 'monthly') return item.amountMinor * 12
  return item.amountMinor
}

// ---------- Reading and writing ----------

export interface RecurringInput {
  name: string
  kind: Recurring['kind']
  amountMinor: number
  categoryId: string
  cadence: Cadence
  startOn: string
  autoLog: boolean
  note?: string | null
  active?: boolean
}

function validate(input: Pick<RecurringInput, 'name' | 'amountMinor'>) {
  if (!input.name.trim()) throw new Error('Give it a name')
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('Amount must be more than zero')
  }
}

export async function listRecurring(): Promise<Recurring[]> {
  const rows = await db.recurring.orderBy('nextDue').toArray()
  return rows.filter((row) => !row.deletedAt)
}

// A start date in the past doesn't back-fill old payments: the next due date is today or later.
export async function addRecurring(input: RecurringInput, today: Date = new Date()) {
  validate(input)
  const now = nowIso()
  const item: Recurring = {
    id: newId(),
    name: input.name.trim().slice(0, 60),
    kind: input.kind,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    cadence: input.cadence,
    startOn: input.startOn,
    nextDue: firstOnOrAfter(input.startOn, input.cadence, toDay(today)),
    autoLog: input.autoLog,
    note: input.note?.trim() || null,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.recurring.add(item)
  await runDueRecurring(today)
  return item
}

export async function updateRecurring(
  id: string,
  input: RecurringInput,
  today: Date = new Date(),
): Promise<void> {
  validate(input)
  const current = await db.recurring.get(id)
  if (!current) return
  // Changing the schedule (or resuming) recomputes the next due date from today.
  const rescheduled =
    current.startOn !== input.startOn ||
    current.cadence !== input.cadence ||
    (!current.active && input.active !== false)
  await db.recurring.update(id, {
    name: input.name.trim().slice(0, 60),
    kind: input.kind,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    cadence: input.cadence,
    startOn: input.startOn,
    autoLog: input.autoLog,
    note: input.note?.trim() || null,
    active: input.active ?? current.active,
    nextDue: rescheduled
      ? firstOnOrAfter(input.startOn, input.cadence, toDay(today))
      : current.nextDue,
    updatedAt: nowIso(),
  })
  await runDueRecurring(today)
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.recurring.update(id, { deletedAt: nowIso(), updatedAt: nowIso() })
}

const MAX_CATCH_UP = 120 // ~2 years of monthly bills; protects against a bad start date

// Log what's due (auto-log items) and move every item's next due date past today.
// Runs in one transaction, so two calls at once (two tabs, React StrictMode) can't double-log.
export async function runDueRecurring(today: Date = new Date()): Promise<number> {
  const day = toDay(today)
  let logged = 0
  await db.transaction('rw', db.recurring, db.expenses, async () => {
    const items = await db.recurring.toArray()
    for (const item of items) {
      if (item.deletedAt || !item.active) continue
      if (!item.autoLog) {
        // Nothing to log: once a due date has passed, show the next one (today stays visible).
        if (item.nextDue < day) {
          await db.recurring.update(item.id, {
            nextDue: firstOnOrAfter(item.startOn, item.cadence, day),
          })
        }
        continue
      }
      if (item.nextDue > day) continue
      let due = item.nextDue
      let count = 0
      while (due <= day && count < MAX_CATCH_UP) {
        const at = fromDay(due)
        at.setHours(9, 0, 0, 0)
        const now = nowIso()
        await db.expenses.add({
          id: newId(),
          spentAt: at.toISOString(),
          amountMinor: item.amountMinor,
          categoryId: item.categoryId,
          paidWith: null,
          note: item.name,
          recurringId: item.id,
          linkedTo: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        logged++
        due = nextAfter(item, due)
        count++
      }
      await db.recurring.update(item.id, { nextDue: due > day ? due : nextAfter(item, day) })
    }
  })
  return logged
}
