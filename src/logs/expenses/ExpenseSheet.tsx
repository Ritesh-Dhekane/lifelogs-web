// Add or edit an expense: amount, category, paid with, date & time (past allowed), note.

import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Sheet } from '../../components/Sheet'
import { Segmented } from '../../components/ui'
import type { Expense, PaidWith } from '../../data/db'
import { addExpense, deleteExpense, listCategories, updateExpense } from '../../data/expenses'
import { fromLocalInput, toLocalInput } from '../../lib/dates'
import { amountInputValue, currencySymbol, parseAmount } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { CategoryGlyph, PAID_WITH_LABEL } from './icons'

export function ExpenseSheet({
  open,
  onClose,
  entry,
  last,
}: {
  open: boolean
  onClose: () => void
  entry: Expense | null // null = new expense
  last: Expense | null // the latest expense, to start a new one with the same category/payment
}) {
  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Edit expense' : 'Add expense'}>
      {open && <ExpenseForm key={entry?.id ?? 'new'} entry={entry} last={last} onDone={onClose} />}
    </Sheet>
  )
}

const PAID_WITH: PaidWith[] = ['upi', 'card', 'cash', 'other']

function ExpenseForm({
  entry,
  last,
  onDone,
}: {
  entry: Expense | null
  last: Expense | null
  onDone: () => void
}) {
  const { currency } = usePrefs()
  const categories = useLiveQuery(() => listCategories())
  const [amount, setAmount] = useState(entry ? amountInputValue(entry.amountMinor, currency) : '')
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? last?.categoryId ?? 'cat-food')
  const [paidWith, setPaidWith] = useState<PaidWith>(
    entry?.paidWith ?? last?.paidWith ?? (currency === 'INR' ? 'upi' : 'card'),
  )
  const [maxWhen] = useState(() => toLocalInput(new Date().toISOString()))
  const [when, setWhen] = useState(() => toLocalInput(entry?.spentAt ?? new Date().toISOString()))
  const [note, setNote] = useState(entry?.note ?? '')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    const amountMinor = parseAmount(amount, currency)
    if (amountMinor === null) {
      setError('Enter an amount more than zero.')
      return
    }
    if (new Date(when).getTime() > Date.now() + 60_000) {
      setError("The date can't be in the future.")
      return
    }
    const input = { spentAt: fromLocalInput(when), amountMinor, categoryId, paidWith, note }
    try {
      if (entry) await updateExpense(entry.id, input)
      else await addExpense(input)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.")
    }
  }

  async function remove() {
    if (!entry) return
    await deleteExpense(entry.id)
    onDone()
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <div className="rounded-[18px] bg-card-2 px-4 py-5">
        <label className="flex items-baseline justify-center gap-2">
          <span className="text-title text-ink-2">{currencySymbol(currency)}</span>
          <span className="sr-only">Amount</span>
          <input
            inputMode="decimal"
            data-autofocus={entry ? undefined : true}
            value={amount}
            placeholder="0"
            onChange={(event) => {
              setAmount(event.target.value)
              setError('')
            }}
            style={{ width: `${Math.max(1, amount.length) + 0.4}ch` }}
            className="max-w-full min-w-[1.4ch] bg-transparent text-left text-[52px] leading-none font-bold tracking-tight tnum outline-none placeholder:text-ink-3"
            aria-invalid={Boolean(error)}
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 px-1 text-label font-medium text-ink-2">Category</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {categories?.map((category) => {
            const active = category.id === categoryId
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                aria-pressed={active}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-meta leading-tight transition-colors ${
                  active ? 'bg-card ring-2 ring-accent' : 'bg-card-2'
                }`}
              >
                <CategoryGlyph icon={category.icon} color={category.color} className="size-5" />
                <span className="line-clamp-2">{category.name}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div>
        <p className="mb-2 px-1 text-label font-medium text-ink-2">Paid with</p>
        <Segmented<PaidWith>
          size="sm"
          label="Paid with"
          value={paidWith}
          onChange={setPaidWith}
          options={PAID_WITH.map((value) => ({ value, label: PAID_WITH_LABEL[value] }))}
        />
      </div>

      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">Date & time</span>
        <input
          type="datetime-local"
          value={when}
          max={maxWhen}
          onChange={(event) => setWhen(event.target.value)}
          className="h-12 rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex justify-between px-1 text-label font-medium text-ink-2">
          Note <span className="font-normal text-ink-3">Optional</span>
        </span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          placeholder="e.g. Lunch with team"
          className="h-12 rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="h-12 rounded-full bg-accent font-semibold text-on-accent active:scale-[0.98]"
      >
        Save
      </button>

      {entry &&
        (confirmDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
            <span className="text-label">Delete this expense?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-9 rounded-full px-3 text-label"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                className="h-9 rounded-full bg-danger px-4 text-label font-semibold text-on-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-2 py-2 text-label font-medium text-danger"
          >
            <Trash2 className="size-4" /> Delete expense
          </button>
        ))}
    </form>
  )
}
