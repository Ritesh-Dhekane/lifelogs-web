import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../../data/db'
import { addExpense } from '../../data/expenses'
import { addWeight } from '../../data/repos'
import { toCsv } from './csv'
import { DATASETS, type ExportContext } from './datasets'
import { presetRange } from './ranges'
import type { ExportTable } from './table'
import { moneyFormat, sheetNames } from './xlsx'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const build = (id: string, ctx: ExportContext) => DATASETS.find((d) => d.id === id)!.build(ctx)
const all: ExportContext = { unit: 'kg', currency: 'INR', range: { from: null, to: null } }
// Local-time ISO strings so day boundaries don't depend on the machine's time zone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()

describe('csv', () => {
  const table: ExportTable = {
    name: 'T',
    columns: [
      { header: 'When', type: 'datetime' },
      { header: 'Amount (INR)', type: 'money' },
      { header: 'Note', type: 'text' },
      { header: 'Done', type: 'boolean' },
    ],
    rows: [
      [at(2026, 10, 2, 9), 1250.5, 'Lunch, with "team"', true],
      [at(2026, 10, 2, 18), -5, '=HYPERLINK("http://evil")', false],
      [null, null, 'line\nbreak', null],
    ],
  }

  it('quotes, guards formulas, keeps numbers plain and starts with a BOM', () => {
    const csv = toCsv(table)
    expect(csv.startsWith('﻿When,Amount (INR),Note,Done\r\n')).toBe(true)
    const lines = csv.slice(1).split('\r\n')
    expect(lines[1]).toBe('2026-10-02 09:00,1250.5,"Lunch, with ""team""",Yes')
    expect(lines[2]).toBe(`2026-10-02 18:00,-5,"'=HYPERLINK(""http://evil"")",No`)
    expect(lines[3]).toBe(',,"line\nbreak",')
  })
})

describe('xlsx helpers', () => {
  it('makes valid, unique sheet names', () => {
    expect(sheetNames(['Bills & subscriptions', 'a/b:c', 'Weights', 'weights', ''])).toEqual([
      'Bills & subscriptions',
      'a b c',
      'Weights',
      'weights 2',
      'Sheet',
    ])
    expect(sheetNames(['x'.repeat(40)])[0]).toHaveLength(31)
  })

  it('formats money with the currency sign', () => {
    expect(moneyFormat('₹', 2)).toBe('"₹"#,##0.00')
    expect(moneyFormat('¥', 0)).toBe('"¥"#,##0')
  })
})

describe('date presets', () => {
  const now = new Date(2026, 9, 2, 15)
  it('covers months and years in local days', () => {
    expect(presetRange('this-month', now, { from: null, to: null })).toEqual({
      from: '2026-10-01',
      to: '2026-10-02',
    })
    expect(presetRange('last-month', now, { from: null, to: null })).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    })
    expect(presetRange('this-year', now, { from: null, to: null })).toEqual({
      from: '2026-01-01',
      to: '2026-10-02',
    })
    expect(presetRange('custom', now, { from: '2026-10-05', to: '2026-10-01' })).toEqual({
      from: '2026-10-01',
      to: '2026-10-05',
    })
  })
})

describe('datasets', () => {
  it('exports weights in the chosen unit, oldest first, within the range', async () => {
    await addWeight({ recordedAt: at(2026, 9, 1), kind: 'general', weightKg: 80 })
    await addWeight({ recordedAt: at(2026, 10, 1), kind: 'before_gym', weightKg: 79.5, note: 'ok' })
    const lb = await build('weights', { ...all, unit: 'lb' })
    expect(lb.columns[1]!.header).toBe('Weight (lb)')
    expect(lb.rows.map((r) => r[1])).toEqual([176.37, 175.27])
    const october = await build('weights', {
      ...all,
      range: { from: '2026-10-01', to: '2026-10-31' },
    })
    expect(october.rows).toEqual([[at(2026, 10, 1), 79.5, 'Before gym', 'ok']])
  })

  it('exports expenses in major units and a month × category summary', async () => {
    await addExpense({
      spentAt: at(2026, 9, 3),
      amountMinor: 25050,
      categoryId: 'cat-food',
      paidWith: 'upi',
      note: 'Lunch',
    })
    await addExpense({ spentAt: at(2026, 10, 1), amountMinor: 10000, categoryId: 'cat-food' })
    await addExpense({ spentAt: at(2026, 10, 2), amountMinor: 50000, categoryId: 'cat-transport' })
    const expenses = await build('expenses', all)
    expect(expenses.rows[0]).toEqual([at(2026, 9, 3), 250.5, 'Food & dining', 'UPI', 'Lunch', null])

    const monthly = await build('monthly', all)
    expect(monthly.columns.map((c) => c.header)).toEqual([
      'Month',
      'Food & dining',
      'Transport',
      'Total (INR)',
    ])
    expect(monthly.rows).toEqual([
      ['2026-09', 250.5, 0, 250.5],
      ['2026-10', 100, 500, 600],
    ])
  })

  it('builds every table from an empty database', async () => {
    for (const d of DATASETS) {
      const table = await d.build(all)
      // Only the built-in categories exist in a new database.
      expect(table.rows.length).toBe(d.id === 'categories' ? 15 : 0)
      expect(table.columns.length).toBeGreaterThan(0)
    }
  })
})
