// Expenses' entries for the shared timeline.

import { listCategories, listExpenses } from '../../data/expenses'
import { formatMoney } from '../../lib/money'
import type { TimelineItem } from '../timeline'
import { PAID_WITH_LABEL } from './icons'

export async function expensesTimeline(): Promise<TimelineItem[]> {
  const [expenses, categories] = await Promise.all([
    listExpenses(),
    listCategories({ includeArchived: true }),
  ])
  const names = new Map(categories.map((c) => [c.id, c.name]))
  return expenses.map((e) => {
    const category = names.get(e.categoryId) ?? 'Expense'
    return {
      id: `expense-${e.id}`,
      log: 'expenses',
      at: e.spentAt,
      title: formatMoney(e.amountMinor),
      detail: [category, e.paidWith ? PAID_WITH_LABEL[e.paidWith] : null]
        .filter(Boolean)
        .join(' · '),
      quote: e.note ?? undefined,
      to: '/expenses/spending',
      searchText: ['expense', 'spent', category, e.note ?? ''].join(' ').toLowerCase(),
    }
  })
}
