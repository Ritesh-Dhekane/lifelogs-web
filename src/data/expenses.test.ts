import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { db } from './db'
import { BUILT_IN_CATEGORIES } from './expenseCategories'
import {
  addCategory,
  addExpense,
  deleteExpense,
  listCategories,
  listExpenses,
  updateCategory,
  updateExpense,
} from './expenses'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('expenses', () => {
  it('seeds the built-in categories in order', async () => {
    const categories = await listCategories()
    expect(categories.map((c) => c.id)).toEqual(BUILT_IN_CATEGORIES.map((c) => c.id))
  })

  it('adds, edits and soft-deletes entries, newest first', async () => {
    const older = await addExpense({
      spentAt: '2026-10-01T09:00:00Z',
      amountMinor: 25000,
      categoryId: 'cat-food',
      note: '  Lunch  ',
    })
    const newer = await addExpense({
      spentAt: '2026-10-02T09:00:00Z',
      amountMinor: 5000,
      categoryId: 'cat-transport',
      paidWith: 'upi',
    })
    expect((await listExpenses()).map((e) => e.id)).toEqual([newer.id, older.id])
    expect(older.note).toBe('Lunch')

    await updateExpense(older.id, { amountMinor: 30000 })
    expect((await db.expenses.get(older.id))!.amountMinor).toBe(30000)

    await deleteExpense(newer.id)
    expect((await listExpenses()).map((e) => e.id)).toEqual([older.id])
  })

  it('rejects amounts that are zero, negative or fractional minor units', async () => {
    const base = { spentAt: '2026-10-01T09:00:00Z', categoryId: 'cat-food' }
    await expect(addExpense({ ...base, amountMinor: 0 })).rejects.toThrow()
    await expect(addExpense({ ...base, amountMinor: -5 })).rejects.toThrow()
    await expect(addExpense({ ...base, amountMinor: 1.5 })).rejects.toThrow()
  })

  it('adds custom categories at the end, sets budgets and hides archived ones', async () => {
    const pets = await addCategory({ name: ' Pets ', icon: 'pet', color: '#a2845e' })
    expect(pets.name).toBe('Pets')
    expect((await listCategories()).at(-1)!.id).toBe(pets.id)

    await updateCategory('cat-food', { budgetMinor: 800000 })
    expect((await db.expenseCategories.get('cat-food'))!.budgetMinor).toBe(800000)
    await expect(updateCategory('cat-food', { budgetMinor: 0 })).rejects.toThrow()

    await updateCategory(pets.id, { archived: true })
    expect((await listCategories()).some((c) => c.id === pets.id)).toBe(false)
    expect((await listCategories({ includeArchived: true })).some((c) => c.id === pets.id)).toBe(
      true,
    )
  })
})
