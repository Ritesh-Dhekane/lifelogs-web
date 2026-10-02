// Add or edit a recurring bill or subscription.

import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Sheet } from '../../components/Sheet'
import { Segmented, Toggle } from '../../components/ui'
import type { Cadence, Recurring } from '../../data/db'
import { listCategories } from '../../data/expenses'
import { addRecurring, deleteRecurring, toDay, updateRecurring } from '../../data/recurring'
import { amountInputValue, currencySymbol, parseAmount } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'

export function RecurringSheet({
  open,
  onClose,
  item,
}: {
  open: boolean
  onClose: () => void
  item: Recurring | null
}) {
  return (
    <Sheet open={open} onClose={onClose} title={item ? item.name : 'New bill or subscription'}>
      {open && <RecurringForm key={item?.id ?? 'new'} item={item} onDone={onClose} />}
    </Sheet>
  )
}

function RecurringForm({ item, onDone }: { item: Recurring | null; onDone: () => void }) {
  const { currency } = usePrefs()
  const categories = useLiveQuery(() => listCategories())
  const [name, setName] = useState(item?.name ?? '')
  const [kind, setKind] = useState<Recurring['kind']>(item?.kind ?? 'subscription')
  const [amount, setAmount] = useState(item ? amountInputValue(item.amountMinor, currency) : '')
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? 'cat-subscriptions')
  const [cadence, setCadence] = useState<Cadence>(item?.cadence ?? 'monthly')
  const [startOn, setStartOn] = useState(() => item?.startOn ?? toDay(new Date()))
  const [autoLog, setAutoLog] = useState(item?.autoLog ?? true)
  const [active, setActive] = useState(item?.active ?? true)
  const [note, setNote] = useState(item?.note ?? '')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function pickKind(next: Recurring['kind']) {
    setKind(next)
    // Follow the kind with the matching category, unless one was chosen by hand.
    if (categoryId === 'cat-subscriptions' || categoryId === 'cat-bills') {
      setCategoryId(next === 'subscription' ? 'cat-subscriptions' : 'cat-bills')
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const amountMinor = parseAmount(amount, currency)
    if (!name.trim()) return setError('Give it a name.')
    if (amountMinor === null) return setError('Enter an amount more than zero.')
    if (!startOn) return setError('Pick the due date.')
    const input = { name, kind, amountMinor, categoryId, cadence, startOn, autoLog, note, active }
    try {
      if (item) await updateRecurring(item.id, input)
      else await addRecurring(input)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.")
    }
  }

  async function remove() {
    if (!item) return
    await deleteRecurring(item.id)
    onDone()
  }

  const field =
    'h-12 rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent'

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <Segmented<Recurring['kind']>
        label="Kind"
        value={kind}
        onChange={pickKind}
        options={[
          { value: 'subscription', label: 'Subscription' },
          { value: 'bill', label: 'Bill' },
        ]}
      />

      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">Name</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          maxLength={60}
          placeholder={kind === 'subscription' ? 'e.g. Netflix' : 'e.g. Electricity'}
          data-autofocus={item ? undefined : true}
          className={field}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">Amount</span>
          <span className="flex items-center gap-2 rounded-xl bg-card-2 px-4 focus-within:ring-2 focus-within:ring-accent">
            <span className="text-body text-ink-2">{currencySymbol(currency)}</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setError('')
              }}
              placeholder="0"
              className="h-12 w-full bg-transparent text-body tnum outline-none"
            />
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={field}
          >
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-2 px-1 text-label font-medium text-ink-2">Repeats</p>
        <Segmented<Cadence>
          size="sm"
          label="Repeats"
          value={cadence}
          onChange={setCadence}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
        />
      </div>

      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">
          {item ? 'First due date' : 'Next due date'}
        </span>
        <input
          type="date"
          value={startOn}
          onChange={(e) => setStartOn(e.target.value)}
          className={field}
          required
        />
      </label>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-card-2 px-4 py-3">
        <span>
          <span className="block text-body">Add to expenses automatically</span>
          <span className="text-label text-ink-2">On each due date, for the amount above</span>
        </span>
        <Toggle label="Add to expenses automatically" checked={autoLog} onChange={setAutoLog} />
      </div>

      {item && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-card-2 px-4 py-3">
          <span>
            <span className="block text-body">Active</span>
            <span className="text-label text-ink-2">Pause it if you've stopped paying</span>
          </span>
          <Toggle label="Active" checked={active} onChange={setActive} />
        </div>
      )}

      <label className="flex flex-col gap-2">
        <span className="flex justify-between px-1 text-label font-medium text-ink-2">
          Note <span className="font-normal text-ink-3">Optional</span>
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="e.g. Family plan, paid by card"
          className={field}
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

      {item &&
        (confirmDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
            <span className="text-label">Delete? Past expenses stay.</span>
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
            <Trash2 className="size-4" /> Delete
          </button>
        ))}
    </form>
  )
}
