import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { db } from './db'
import { listExpenses } from './expenses'
import {
  addRecurring,
  firstOnOrAfter,
  monthlyCost,
  occurrence,
  runDueRecurring,
  updateRecurring,
  yearlyCost,
  type RecurringInput,
} from './recurring'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12)

const netflix: RecurringInput = {
  name: 'Netflix',
  kind: 'subscription',
  amountMinor: 64900,
  categoryId: 'cat-subscriptions',
  cadence: 'monthly',
  startOn: '2026-10-05',
  autoLog: true,
}

describe('due dates', () => {
  it('keeps the start day, clamping to short months', () => {
    expect(occurrence('2026-01-31', 'monthly', 1)).toBe('2026-02-28')
    expect(occurrence('2026-01-31', 'monthly', 2)).toBe('2026-03-31')
    expect(occurrence('2028-02-29', 'yearly', 1)).toBe('2029-02-28')
    expect(occurrence('2026-10-02', 'weekly', 3)).toBe('2026-10-23')
  })

  it('finds the first due date on or after a day', () => {
    expect(firstOnOrAfter('2026-01-31', 'monthly', '2026-03-01')).toBe('2026-03-31')
    expect(firstOnOrAfter('2026-01-31', 'monthly', '2026-02-28')).toBe('2026-02-28')
    expect(firstOnOrAfter('2020-06-15', 'yearly', '2026-10-02')).toBe('2027-06-15')
    expect(firstOnOrAfter('2026-12-01', 'monthly', '2026-10-02')).toBe('2026-12-01')
  })

  it('converts costs to per month and per year', () => {
    expect(monthlyCost({ amountMinor: 120000, cadence: 'yearly' })).toBe(10000)
    expect(yearlyCost({ amountMinor: 64900, cadence: 'monthly' })).toBe(778800)
    expect(monthlyCost({ amountMinor: 1200, cadence: 'weekly' })).toBe(5200)
  })
})

describe('auto-logging', () => {
  it('logs on the due date, catches up missed ones and never logs twice', async () => {
    await addRecurring(netflix, day(2026, 10, 2))
    expect(await listExpenses()).toHaveLength(0)

    // Opened again on Dec 20: Oct 5, Nov 5 and Dec 5 are due.
    expect(await runDueRecurring(day(2026, 12, 20))).toBe(3)
    expect(await runDueRecurring(day(2026, 12, 20))).toBe(0)
    const logged = await listExpenses()
    expect(logged.map((e) => e.spentAt.slice(0, 10))).toEqual([
      expect.stringMatching(/2026-12-0[45]/),
      expect.stringMatching(/2026-11-0[45]/),
      expect.stringMatching(/2026-10-0[45]/),
    ])
    expect(logged.every((e) => e.amountMinor === 64900 && e.note === 'Netflix')).toBe(true)
    expect((await db.recurring.toArray())[0]!.nextDue).toBe('2027-01-05')
  })

  it('does not double-log when two runs overlap', async () => {
    await addRecurring(netflix, day(2026, 10, 2))
    await Promise.all([runDueRecurring(day(2026, 10, 5)), runDueRecurring(day(2026, 10, 5))])
    expect(await listExpenses()).toHaveLength(1)
  })

  it('does not back-fill payments before it was added', async () => {
    await addRecurring({ ...netflix, startOn: '2025-01-05' }, day(2026, 10, 2))
    expect(await listExpenses()).toHaveLength(0)
    expect((await db.recurring.toArray())[0]!.nextDue).toBe('2026-10-05')
  })

  it('only moves the date on for bills that are not auto-logged, and skips paused ones', async () => {
    const rent = await addRecurring(
      { ...netflix, name: 'Rent', autoLog: false, startOn: '2026-10-01' },
      day(2026, 9, 20),
    )
    await runDueRecurring(day(2026, 10, 1))
    expect((await db.recurring.get(rent.id))!.nextDue).toBe('2026-10-01') // due today stays
    await runDueRecurring(day(2026, 10, 3))
    expect((await db.recurring.get(rent.id))!.nextDue).toBe('2026-11-01')
    expect(await listExpenses()).toHaveLength(0)

    const gym = await addRecurring(
      { ...netflix, name: 'Gym', startOn: '2026-10-10' },
      day(2026, 10, 2),
    )
    await updateRecurring(gym.id, { ...netflix, name: 'Gym', startOn: '2026-10-10', active: false })
    await runDueRecurring(day(2026, 11, 20))
    expect((await listExpenses()).filter((e) => e.note === 'Gym')).toHaveLength(0)
  })
})
