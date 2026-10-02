// Expenses › Recurring: subscriptions and bills, what's due next and what they cost per month
// and per year.

import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarClock, Plus, Repeat } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { Card, EmptyState, SectionLabel } from '../../components/ui'
import type { ExpenseCategory, Recurring } from '../../data/db'
import { listCategories } from '../../data/expenses'
import { listRecurring, monthlyCost, toDay, yearlyCost } from '../../data/recurring'
import { formatMoney, minorDigits } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { CategoryGlyph } from './icons'
import { RecurringSheet } from './RecurringSheet'
import { cadenceLabel, dueLabel } from './recurringLabels'

export function RecurringPage() {
  const items = useLiveQuery(listRecurring)
  const categories = useLiveQuery(() => listCategories({ includeArchived: true }))
  const { currency } = usePrefs()
  const [params, setParams] = useSearchParams()
  const [now] = useState(() => new Date())
  const [editing, setEditing] = useState<Recurring | null>(null)
  const adding = params.get('add') === '1'

  if (!items || !categories) return null

  const byId = new Map(categories.map((c) => [c.id, c]))
  const active = items.filter((i) => i.active)
  const horizon = toDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30))
  const upcoming = active.filter((i) => i.nextDue <= horizon)
  // Summaries in whole units: yearly ÷ 12 leaves paise that mean nothing here.
  const unit = 10 ** minorDigits(currency)
  const whole = (minor: number) => Math.round(minor / unit) * unit
  const perMonth = whole(active.reduce((sum, i) => sum + monthlyCost(i), 0))
  const perYear = whole(active.reduce((sum, i) => sum + yearlyCost(i), 0))
  const subscriptions = active.filter((i) => i.kind === 'subscription')

  function openAdd() {
    setParams({ add: '1' }, { replace: true })
  }
  function closeSheet() {
    setEditing(null)
    if (adding) setParams({}, { replace: true })
  }

  return (
    <div className="flex flex-col gap-2 pb-16">
      {items.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No bills or subscriptions yet"
          text="Add rent, phone, streaming and gym once. They're added to your expenses on their due dates, and you'll see what they cost per year."
          action={
            <button
              type="button"
              onClick={openAdd}
              className="h-11 rounded-full bg-accent px-5 font-semibold text-on-accent"
            >
              Add one
            </button>
          }
        />
      ) : (
        <>
          <Card className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-label text-ink-2">Per month</p>
              <p className="text-title tnum">{formatMoney(perMonth, currency)}</p>
            </div>
            <div>
              <p className="text-label text-ink-2">Per year</p>
              <p className="text-title tnum">{formatMoney(perYear, currency)}</p>
            </div>
            {subscriptions.length > 0 && (
              <p className="col-span-2 text-label text-ink-2">
                {subscriptions.length}{' '}
                {subscriptions.length === 1 ? 'subscription' : 'subscriptions'} cost{' '}
                {formatMoney(
                  subscriptions.reduce((s, i) => s + yearlyCost(i), 0),
                  currency,
                )}{' '}
                a year.
              </p>
            )}
          </Card>

          {upcoming.length > 0 && (
            <>
              <SectionLabel>Next 30 days</SectionLabel>
              <Card as="div" className="flex flex-col divide-y divide-line px-0 py-1">
                {upcoming.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    category={byId.get(item.categoryId)}
                    now={now}
                    onOpen={() => setEditing(item)}
                  />
                ))}
              </Card>
            </>
          )}

          {(['subscription', 'bill'] as const).map((kind) => {
            const list = items
              .filter((i) => i.kind === kind)
              .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
            if (list.length === 0) return null
            return (
              <section key={kind}>
                <SectionLabel>{kind === 'subscription' ? 'Subscriptions' : 'Bills'}</SectionLabel>
                <Card as="div" className="flex flex-col divide-y divide-line px-0 py-1">
                  {list.map((item) => (
                    <Row
                      key={item.id}
                      item={item}
                      category={byId.get(item.categoryId)}
                      now={now}
                      onOpen={() => setEditing(item)}
                    />
                  ))}
                </Card>
              </section>
            )
          })}

          <p className="flex items-start gap-2 px-1 pt-2 text-label text-ink-2">
            <CalendarClock className="mt-0.5 size-4 shrink-0" />
            Auto-added ones appear in Spending on their due date, also if the app wasn't open that
            day.
          </p>
        </>
      )}

      {items.length > 0 && (
        <button
          type="button"
          onClick={openAdd}
          className="fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-on-accent shadow-float active:scale-95 lg:bottom-8"
        >
          <Plus className="size-5" /> Add
        </button>
      )}

      <RecurringSheet open={adding || editing !== null} onClose={closeSheet} item={editing} />
    </div>
  )
}

function Row({
  item,
  category,
  now,
  onOpen,
}: {
  item: Recurring
  category: ExpenseCategory | undefined
  now: Date
  onOpen: () => void
}) {
  const { currency } = usePrefs()
  const today = toDay(now)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-card-2"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card-2">
        <CategoryGlyph icon={category?.icon ?? 'repeat'} color={category?.color} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body">
          {item.name}
          {!item.active && <span className="text-ink-2"> · paused</span>}
        </span>
        <span className="block truncate text-label text-ink-2">
          {cadenceLabel(item)}
          {item.autoLog ? ' · auto-added' : ''}
        </span>
      </span>
      <span className="text-right text-label tnum">
        <span className="block text-body font-semibold">
          {formatMoney(item.amountMinor, currency)}
        </span>
        {item.active && (
          <span className={item.nextDue <= today ? 'text-expenses-ink' : 'text-ink-2'}>
            {dueLabel(item.nextDue, now)}
          </span>
        )}
      </span>
    </button>
  )
}
