// Reading and writing Expenses data: entries and categories. Amounts are whole minor units.

import { db, newId, nowIso, type Expense, type ExpenseCategory, type PaidWith } from './db'

export interface ExpenseInput {
  spentAt: string
  amountMinor: number
  categoryId: string
  paidWith?: PaidWith | null
  note?: string | null
  recurringId?: string | null
  linkedTo?: string | null
}

export const MAX_AMOUNT_MINOR = 1_000_000_000_00 // a billion, in any currency

function validate(input: Pick<ExpenseInput, 'amountMinor' | 'categoryId'>) {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('Amount must be more than zero')
  }
  if (input.amountMinor > MAX_AMOUNT_MINOR) throw new Error('Amount is too large')
  if (!input.categoryId) throw new Error('Pick a category')
}

function clean(note: string | null | undefined): string | null {
  const text = note?.trim()
  return text ? text.slice(0, 500) : null
}

// ---------- Entries ----------

export async function listExpenses(): Promise<Expense[]> {
  const rows = await db.expenses.orderBy('spentAt').reverse().toArray()
  return rows.filter((row) => !row.deletedAt)
}

export async function getExpense(id: string): Promise<Expense | undefined> {
  const row = await db.expenses.get(id)
  return row && !row.deletedAt ? row : undefined
}

export async function addExpense(input: ExpenseInput): Promise<Expense> {
  validate(input)
  const now = nowIso()
  const expense: Expense = {
    id: newId(),
    spentAt: input.spentAt,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    paidWith: input.paidWith ?? null,
    note: clean(input.note),
    recurringId: input.recurringId ?? null,
    linkedTo: input.linkedTo ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.expenses.add(expense)
  return expense
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<void> {
  const current = await db.expenses.get(id)
  if (!current) return
  const next = { ...current, ...input }
  validate(next)
  await db.expenses.update(id, {
    spentAt: next.spentAt,
    amountMinor: next.amountMinor,
    categoryId: next.categoryId,
    paidWith: next.paidWith ?? null,
    note: clean(next.note),
    updatedAt: nowIso(),
  })
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.update(id, { deletedAt: nowIso(), updatedAt: nowIso() })
}

// ---------- Categories ----------

export async function listCategories(options: { includeArchived?: boolean } = {}) {
  const rows = await db.expenseCategories.orderBy('position').toArray()
  return options.includeArchived ? rows : rows.filter((row) => !row.archived)
}

export async function addCategory(input: {
  name: string
  icon: string
  color: string
}): Promise<ExpenseCategory> {
  const name = input.name.trim().slice(0, 40)
  if (!name) throw new Error('Give the category a name')
  const last = await db.expenseCategories.orderBy('position').last()
  const category: ExpenseCategory = {
    id: newId(),
    name,
    icon: input.icon,
    color: input.color,
    budgetMinor: null,
    position: (last?.position ?? -1) + 1,
    isCustom: true,
    archived: false,
  }
  await db.expenseCategories.add(category)
  return category
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<ExpenseCategory, 'name' | 'icon' | 'color' | 'budgetMinor' | 'archived'>>,
): Promise<void> {
  const changes = { ...patch }
  if (changes.name !== undefined) {
    changes.name = changes.name.trim().slice(0, 40)
    if (!changes.name) throw new Error('Give the category a name')
  }
  if (changes.budgetMinor !== undefined && changes.budgetMinor !== null) {
    if (!Number.isInteger(changes.budgetMinor) || changes.budgetMinor <= 0) {
      throw new Error('Budget must be more than zero')
    }
  }
  await db.expenseCategories.update(id, changes)
}
