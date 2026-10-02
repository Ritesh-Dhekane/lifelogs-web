// Expenses on the Today screen: spent today, this month so far, and budgets that need attention.

import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Card, LogBadge } from '../../components/ui'
import { listCategories, listExpenses } from '../../data/expenses'
import { sameDay } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { getLog } from '../registry'
import { budgetStatus, inMonth, monthElapsed, monthKey, total } from './stats'

export function ExpensesTodayCard() {
  const expenses = useLiveQuery(listExpenses)
  const categories = useLiveQuery(() => listCategories())
  const { currency } = usePrefs()
  const [now] = useState(() => new Date())
  const log = getLog('expenses')

  if (!expenses || !categories)
    return (
      <Card className="h-40 animate-pulse" aria-label="Expenses">
        {null}
      </Card>
    )

  const month = monthKey(now)
  const today = total(expenses.filter((e) => sameDay(e.spentAt, now)))
  const thisMonth = total(inMonth(expenses, month))
  const elapsed = monthElapsed(month, now)
  // Over budget, or spending well ahead of the month.
  const alerts = budgetStatus(expenses, categories, month)
    .filter((b) => b.over || b.share > elapsed + 0.15)
    .sort((a, b) => b.share - a.share)
    .slice(0, 2)

  return (
    <Card aria-label="Expenses" className="flex flex-col gap-4">
      <Link to="/expenses" className="flex items-center gap-3">
        <LogBadge icon={log.icon} colorClass={log.color.text} softClass={log.color.soft} />
        <span className="flex-1">
          <span className="block text-heading">Expenses</span>
          <span className="text-label text-ink-2">
            {formatMoney(thisMonth, currency)} this month
          </span>
        </span>
        <ChevronRight className="size-5 text-ink-3" />
      </Link>

      <div className="flex items-end justify-between gap-3">
        <p>
          <span className="block text-label text-ink-2">Spent today</span>
          <span className="text-[32px] leading-none font-bold tracking-tight tnum">
            {formatMoney(today, currency)}
          </span>
        </p>
        <Link
          to="/expenses/spending?add=1"
          className="flex h-10 items-center gap-1.5 rounded-full bg-card-2 px-4 text-label font-semibold"
        >
          <Plus className="size-4" /> Add
        </Link>
      </div>

      {alerts.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {alerts.map((b) => (
            <li key={b.category.id}>
              <Link
                to="/expenses/budgets"
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-label ${
                  b.over ? 'bg-danger/10 text-danger' : 'bg-expenses/12 text-expenses-ink'
                }`}
              >
                <span className="font-medium">{b.category.name}</span>
                <span className="tnum">
                  {b.over
                    ? `${formatMoney(b.spentMinor - b.budgetMinor, currency)} over budget`
                    : `${Math.round(b.share * 100)}% of budget used`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
