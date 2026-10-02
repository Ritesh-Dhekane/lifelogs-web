// Expenses › Budgets: this month's spending against each category's monthly budget, and the
// place to edit, add or hide categories.

import { useLiveQuery } from 'dexie-react-hooks'
import { Eye, Plus } from 'lucide-react'
import { useState } from 'react'

import { Card, SectionLabel } from '../../components/ui'
import type { ExpenseCategory } from '../../data/db'
import { listCategories, listExpenses, updateCategory } from '../../data/expenses'
import { formatMoney } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { CategorySheet } from './CategorySheet'
import { CategoryGlyph } from './icons'
import { byCategory, inMonth, monthElapsed, monthKey } from './stats'

export function BudgetsPage() {
  const expenses = useLiveQuery(listExpenses)
  const categories = useLiveQuery(() => listCategories({ includeArchived: true }))
  const { currency } = usePrefs()
  const [now] = useState(() => new Date())
  const [editing, setEditing] = useState<ExpenseCategory | 'new' | null>(null)

  if (!expenses || !categories) return null

  const month = monthKey(now)
  const spent = new Map(
    byCategory(inMonth(expenses, month)).map((c) => [c.categoryId, c.amountMinor]),
  )
  const visible = categories.filter((c) => !c.archived)
  const hidden = categories.filter((c) => c.archived)
  const budgeted = visible.filter((c) => c.budgetMinor)
  const totalBudget = budgeted.reduce((sum, c) => sum + c.budgetMinor!, 0)
  const totalSpent = budgeted.reduce((sum, c) => sum + (spent.get(c.id) ?? 0), 0)
  const elapsed = monthElapsed(month, now)

  return (
    <div className="flex flex-col gap-2">
      <Card className="flex flex-col gap-3">
        {totalBudget ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-label text-ink-2">Budgeted categories this month</p>
                <p className="text-title tnum">
                  {formatMoney(totalSpent, currency)}{' '}
                  <span className="text-body font-normal text-ink-2">
                    of {formatMoney(totalBudget, currency)}
                  </span>
                </p>
              </div>
              <p className="text-label text-ink-2 tnum">
                {Math.round(elapsed * 100)}% of month gone
              </p>
            </div>
            <Progress share={totalSpent / totalBudget} elapsed={elapsed} />
          </>
        ) : (
          <p className="text-label text-ink-2">
            Set a monthly budget on any category to see how you're doing. Tap a category below.
          </p>
        )}
      </Card>

      <SectionLabel>Categories</SectionLabel>
      <Card as="div" className="flex flex-col divide-y divide-line px-0 py-1">
        {visible.map((category) => {
          const used = spent.get(category.id) ?? 0
          const budget = category.budgetMinor
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setEditing(category)}
              className="flex w-full flex-col gap-2 px-4 py-3 text-left active:bg-card-2"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card-2">
                  <CategoryGlyph icon={category.icon} color={category.color} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body">{category.name}</span>
                  <span className="text-label text-ink-2 tnum">
                    {budget
                      ? used > budget
                        ? `${formatMoney(used - budget, currency)} over`
                        : `${formatMoney(budget - used, currency)} left`
                      : 'No budget'}
                  </span>
                </span>
                <span className="text-right text-label tnum">
                  <span className="block font-semibold">{formatMoney(used, currency)}</span>
                  {budget ? (
                    <span className="text-ink-2">of {formatMoney(budget, currency)}</span>
                  ) : null}
                </span>
              </span>
              {budget ? <Progress share={used / budget} elapsed={elapsed} /> : null}
            </button>
          )
        })}
      </Card>

      <button
        type="button"
        onClick={() => setEditing('new')}
        className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full bg-card font-medium"
      >
        <Plus className="size-4" /> New category
      </button>

      {hidden.length > 0 && (
        <>
          <SectionLabel>Hidden</SectionLabel>
          <Card as="div" className="flex flex-col divide-y divide-line px-0 py-1">
            {hidden.map((category) => (
              <div key={category.id} className="flex items-center gap-3 px-4 py-3">
                <CategoryGlyph icon={category.icon} color={category.color} />
                <span className="flex-1 text-body text-ink-2">{category.name}</span>
                <button
                  type="button"
                  onClick={() => updateCategory(category.id, { archived: false })}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-card-2 px-3 text-label font-medium"
                >
                  <Eye className="size-4" /> Show
                </button>
              </div>
            ))}
          </Card>
        </>
      )}

      <CategorySheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        category={editing === 'new' ? null : editing}
      />
    </div>
  )
}

// A budget bar: green while on pace, amber when ahead of the month, red once over.
// The tick marks how much of the month has gone.
export function Progress({ share, elapsed }: { share: number; elapsed: number }) {
  const tone = share > 1 ? 'bg-danger' : share > elapsed + 0.1 ? 'bg-expenses' : 'bg-success'
  return (
    <span
      className="relative block h-2 overflow-hidden rounded-full bg-card-2"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
      aria-label="Budget used"
    >
      <span
        className={`block h-full rounded-full ${tone}`}
        style={{ width: `${Math.min(1, share) * 100}%` }}
      />
      <span
        className="absolute top-0 h-full w-0.5 bg-ink/40"
        style={{ left: `${elapsed * 100}%` }}
        aria-hidden
      />
    </span>
  )
}
