// Expenses › Spending: one month at a time — total, where it went, and every entry by day.

import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Plus, Receipt, Repeat } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { Card, EmptyState } from '../../components/ui'
import type { Expense, ExpenseCategory } from '../../data/db'
import { listCategories, listExpenses } from '../../data/expenses'
import { dayLabel, timeLabel } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { ExpenseSheet } from './ExpenseSheet'
import { CategoryGlyph, PAID_WITH_LABEL } from './icons'
import { MonthSummary } from './MonthSummary'
import { addMonths, byDay, inMonth, monthKey, monthLabel } from './stats'

export function SpendingPage() {
  const expenses = useLiveQuery(listExpenses)
  const categories = useLiveQuery(() => listCategories({ includeArchived: true }))
  const { currency } = usePrefs()
  const [params, setParams] = useSearchParams()
  const [now] = useState(() => new Date())
  const [month, setMonth] = useState(() => monthKey(now))
  const [editing, setEditing] = useState<Expense | null>(null)
  const adding = params.get('add') === '1'

  if (!expenses || !categories) return null

  const byId = new Map(categories.map((c) => [c.id, c]))
  const entries = inMonth(expenses, month)
  const isCurrent = month === monthKey(now)

  function openAdd() {
    setParams({ add: '1' }, { replace: true })
  }
  function closeSheet() {
    setEditing(null)
    if (adding) setParams({}, { replace: true })
  }

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div className="flex items-center justify-between rounded-full bg-card p-1">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="grid size-10 place-items-center rounded-full active:bg-card-2"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="text-body font-semibold" aria-live="polite">
          {monthLabel(month, now)}
        </p>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          disabled={isCurrent}
          className="grid size-10 place-items-center rounded-full active:bg-card-2 disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          text="Add what you spend as you go — it takes two taps. Totals, categories and budgets build up from there."
          action={
            <button
              type="button"
              onClick={openAdd}
              className="h-11 rounded-full bg-accent px-5 font-semibold text-on-accent"
            >
              Add expense
            </button>
          }
        />
      ) : (
        <>
          <MonthSummary expenses={expenses} categories={categories} month={month} now={now} />

          {entries.length === 0 ? (
            <p className="py-8 text-center text-label text-ink-2">
              Nothing spent in {monthLabel(month, now)}.
            </p>
          ) : (
            byDay(entries).map((group) => (
              <section key={group.day} aria-label={dayLabel(group.day, now)}>
                <h2 className="mb-2 flex items-center justify-between px-1 text-meta uppercase text-ink-3">
                  <span>{dayLabel(group.day, now)}</span>
                  <span className="tnum normal-case tracking-normal">
                    {formatMoney(group.totalMinor, currency)}
                  </span>
                </h2>
                <Card as="div" className="flex flex-col divide-y divide-line px-0 py-1">
                  {group.items.map((entry) => (
                    <ExpenseRow
                      key={entry.id}
                      entry={entry}
                      category={byId.get(entry.categoryId)}
                      onOpen={() => setEditing(entry)}
                    />
                  ))}
                </Card>
              </section>
            ))
          )}
        </>
      )}

      {expenses.length > 0 && (
        <button
          type="button"
          onClick={openAdd}
          className="fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-on-accent shadow-float active:scale-95 lg:bottom-8"
        >
          <Plus className="size-5" /> Add expense
        </button>
      )}

      <ExpenseSheet
        open={adding || editing !== null}
        onClose={closeSheet}
        entry={editing}
        last={expenses[0] ?? null}
      />
    </div>
  )
}

function ExpenseRow({
  entry,
  category,
  onOpen,
}: {
  entry: Expense
  category: ExpenseCategory | undefined
  onOpen: () => void
}) {
  const { currency } = usePrefs()
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-card-2"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card-2" aria-hidden>
        <CategoryGlyph icon={category?.icon ?? 'dots'} color={category?.color} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body">
          {entry.note ?? category?.name ?? 'Expense'}
        </span>
        <span className="flex items-center gap-1 truncate text-label text-ink-2">
          {entry.note && category ? `${category.name} · ` : ''}
          {timeLabel(entry.spentAt)}
          {entry.paidWith ? ` · ${PAID_WITH_LABEL[entry.paidWith]}` : ''}
          {entry.recurringId && <Repeat className="size-3.5" aria-label="Recurring" />}
        </span>
      </span>
      <span className="text-body font-semibold tnum">
        {formatMoney(entry.amountMinor, currency)}
      </span>
    </button>
  )
}
