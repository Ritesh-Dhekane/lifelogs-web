// The month's total with a comparison to the same point of the previous month, and a bar per
// category showing where the money went.

import type { Expense, ExpenseCategory } from '../../data/db'
import { Card } from '../../components/ui'
import { formatMoney } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import {
  addMonths,
  byCategory,
  inMonth,
  inRange,
  monthKey,
  monthlyTotals,
  monthStart,
  total,
} from './stats'

export function MonthSummary({
  expenses,
  categories,
  month,
  now,
}: {
  expenses: Expense[]
  categories: ExpenseCategory[]
  month: string
  now: Date
}) {
  const { currency } = usePrefs()
  const byId = new Map(categories.map((c) => [c.id, c]))
  const entries = inMonth(expenses, month)
  const sum = total(entries)
  const parts = byCategory(entries)

  // This month so far vs the same number of days of last month; past months vs the whole month.
  const start = monthStart(month)
  const prevStart = monthStart(addMonths(month, -1))
  const isCurrent = month === monthKey(now)
  const prevEnd = isCurrent
    ? new Date(prevStart.getTime() + (now.getTime() - start.getTime()))
    : start
  const previous = total(inRange(expenses, prevStart, prevEnd))
  const diff = previous ? (sum - previous) / previous : null

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-label text-ink-2">{isCurrent ? 'Spent this month' : 'Spent'}</p>
        <p className="text-[40px] leading-tight font-bold tracking-tight tnum">
          {formatMoney(sum, currency)}
        </p>
        {diff !== null && (
          <p className="text-label text-ink-2">
            <span className={diff > 0 ? 'text-danger' : 'text-success'}>
              {diff > 0 ? '▲' : '▼'} {Math.abs(Math.round(diff * 100))}%
            </span>{' '}
            vs {isCurrent ? 'the same point last month' : 'the month before'} (
            {formatMoney(previous, currency)})
          </p>
        )}
      </div>

      {parts.length > 0 && (
        <>
          <div
            className="flex h-3 overflow-hidden rounded-full bg-card-2"
            role="img"
            aria-label={parts
              .map(
                (p) => `${byId.get(p.categoryId)?.name ?? 'Other'} ${Math.round(p.share * 100)}%`,
              )
              .join(', ')}
          >
            {parts.map((p) => (
              <span
                key={p.categoryId}
                style={{
                  width: `${p.share * 100}%`,
                  backgroundColor: byId.get(p.categoryId)?.color,
                }}
                className="h-full border-r-2 border-card last:border-r-0"
              />
            ))}
          </div>
          <ul className="flex flex-col gap-2">
            {parts.slice(0, 6).map((p) => {
              const category = byId.get(p.categoryId)
              return (
                <li key={p.categoryId} className="flex items-center gap-3 text-label">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: category?.color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{category?.name ?? 'Other'}</span>
                  <span className="text-ink-2 tnum">{Math.round(p.share * 100)}%</span>
                  <span className="w-24 text-right font-medium tnum">
                    {formatMoney(p.amountMinor, currency)}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <MonthBars expenses={expenses} month={month} />
    </Card>
  )
}

// The last six months as small bars, the selected one highlighted.
function MonthBars({ expenses, month }: { expenses: Expense[]; month: string }) {
  const { currency } = usePrefs()
  const months = monthlyTotals(expenses, month, 6)
  const peak = Math.max(...months.map((m) => m.totalMinor), 1)
  if (months.filter((m) => m.totalMinor > 0).length < 2) return null
  return (
    <figure className="flex flex-col gap-2 border-t border-line pt-3">
      <figcaption className="text-label text-ink-2">Last 6 months</figcaption>
      <ol className="flex h-24 items-end gap-2">
        {months.map((m) => (
          <li key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span
              className={`w-full max-w-10 rounded-md ${m.month === month ? 'bg-expenses' : 'bg-card-2'}`}
              style={{ height: `${Math.max(4, (m.totalMinor / peak) * 100)}%` }}
              title={formatMoney(m.totalMinor, currency)}
            />
            <span className="text-meta text-ink-3 normal-case tracking-normal">
              {monthStart(m.month).toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="sr-only">{formatMoney(m.totalMinor, currency)}</span>
          </li>
        ))}
      </ol>
    </figure>
  )
}
