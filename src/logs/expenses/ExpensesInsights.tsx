// Expenses' section on the Insights screen for one week.

import { useLiveQuery } from 'dexie-react-hooks'

import { Card, LogBadge } from '../../components/ui'
import { listCategories, listExpenses } from '../../data/expenses'
import { formatMoney } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { change } from '../lift/liftStats'
import { getLog } from '../registry'
import { byCategory, inRange, total } from './stats'

export function ExpensesInsights({ from, to, now }: { from: Date; to: Date; now: Date }) {
  const expenses = useLiveQuery(listExpenses)
  const categories = useLiveQuery(() => listCategories({ includeArchived: true }))
  const { currency } = usePrefs()
  const log = getLog('expenses')
  if (!expenses || !categories) return null

  const byId = new Map(categories.map((c) => [c.id, c]))
  const week = inRange(expenses, from, to)
  const sum = total(week)
  // The current week is compared with the same point of last week.
  const span = to.getTime() - from.getTime()
  const elapsed = Math.min(span, Math.max(0, now.getTime() - from.getTime()))
  const before = total(
    inRange(expenses, new Date(from.getTime() - span), new Date(from.getTime() - span + elapsed)),
  )
  const diff = change(sum, before)
  const days = Math.max(1, Math.ceil(elapsed / 864e5))
  const parts = byCategory(week).slice(0, 4)
  const biggest = [...week].sort((a, b) => b.amountMinor - a.amountMinor)[0]

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <LogBadge icon={log.icon} colorClass={log.color.text} softClass={log.color.soft} />
        <div>
          <h2 className="text-heading">Spending</h2>
          <p className="text-label text-ink-2">
            {week.length === 0
              ? 'Nothing logged this week'
              : `${week.length} ${week.length === 1 ? 'expense' : 'expenses'}`}
          </p>
        </div>
      </div>

      {week.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-card-2 p-3">
              <p className="text-label text-ink-2">Total</p>
              <p className="text-heading tnum">{formatMoney(sum, currency)}</p>
              {diff !== null && (
                <p className="text-label text-ink-2 tnum">
                  {diff > 0 ? '+' : ''}
                  {Math.round(diff * 100)}% vs last week
                </p>
              )}
            </div>
            <div className="rounded-xl bg-card-2 p-3">
              <p className="text-label text-ink-2">Per day</p>
              <p className="text-heading tnum">{formatMoney(Math.round(sum / days), currency)}</p>
              {biggest && (
                <p className="truncate text-label text-ink-2">
                  Biggest {formatMoney(biggest.amountMinor, currency)}
                </p>
              )}
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {parts.map((p) => {
              const category = byId.get(p.categoryId)
              return (
                <li key={p.categoryId} className="flex flex-col gap-1">
                  <span className="flex justify-between text-label">
                    <span>{category?.name ?? 'Other'}</span>
                    <span className="tnum">{formatMoney(p.amountMinor, currency)}</span>
                  </span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-card-2" aria-hidden>
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${p.share * 100}%`, backgroundColor: category?.color }}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}
