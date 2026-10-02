// Edit a category (name, icon, colour, monthly budget, hide) or add a custom one.

import { EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Sheet } from '../../components/Sheet'
import type { ExpenseCategory } from '../../data/db'
import { CATEGORY_COLORS } from '../../data/expenseCategories'
import { addCategory, updateCategory } from '../../data/expenses'
import { amountInputValue, currencySymbol, parseAmount } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { CATEGORY_ICONS, CategoryGlyph } from './icons'

export function CategorySheet({
  open,
  onClose,
  category,
}: {
  open: boolean
  onClose: () => void
  category: ExpenseCategory | null // null = new category
}) {
  return (
    <Sheet open={open} onClose={onClose} title={category ? category.name : 'New category'}>
      {open && <CategoryForm key={category?.id ?? 'new'} category={category} onDone={onClose} />}
    </Sheet>
  )
}

function CategoryForm({
  category,
  onDone,
}: {
  category: ExpenseCategory | null
  onDone: () => void
}) {
  const { currency } = usePrefs()
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? 'dots')
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]!)
  const [budget, setBudget] = useState(
    category?.budgetMinor ? amountInputValue(category.budgetMinor, currency) : '',
  )
  const [error, setError] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault()
    const budgetMinor = budget.trim() ? parseAmount(budget, currency) : null
    if (budget.trim() && budgetMinor === null) {
      setError('Enter a budget more than zero, or leave it empty.')
      return
    }
    try {
      if (category) await updateCategory(category.id, { name, icon, color, budgetMinor })
      else {
        const created = await addCategory({ name, icon, color })
        if (budgetMinor) await updateCategory(created.id, { budgetMinor })
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.")
    }
  }

  async function hide() {
    if (!category) return
    await updateCategory(category.id, { archived: true })
    onDone()
  }

  const field =
    'h-12 rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent'

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">Name</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          maxLength={40}
          required
          data-autofocus={category ? undefined : true}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex justify-between px-1 text-label font-medium text-ink-2">
          Monthly budget <span className="font-normal text-ink-3">Optional</span>
        </span>
        <span className="flex items-center gap-2 rounded-xl bg-card-2 px-4 focus-within:ring-2 focus-within:ring-accent">
          <span className="text-body text-ink-2">{currencySymbol(currency)}</span>
          <input
            inputMode="decimal"
            value={budget}
            onChange={(e) => {
              setBudget(e.target.value)
              setError('')
            }}
            placeholder="No budget"
            className="h-12 flex-1 bg-transparent text-body tnum outline-none"
          />
        </span>
      </label>

      <fieldset>
        <legend className="mb-2 px-1 text-label font-medium text-ink-2">Icon</legend>
        <div className="grid grid-cols-6 gap-2">
          {Object.keys(CATEGORY_ICONS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-pressed={icon === key}
              aria-label={key}
              className={`grid aspect-square place-items-center rounded-xl ${
                icon === key ? 'bg-card ring-2 ring-accent' : 'bg-card-2'
              }`}
            >
              <CategoryGlyph icon={key} color={color} className="size-5" />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 px-1 text-label font-medium text-ink-2">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-pressed={color === c}
              aria-label={`Colour ${c}`}
              className={`size-9 rounded-full ${color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </fieldset>

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

      {category && (
        <button
          type="button"
          onClick={hide}
          className="flex items-center justify-center gap-2 py-2 text-label font-medium text-ink-2"
        >
          <EyeOff className="size-4" /> Hide this category
        </button>
      )}
      {category && (
        <p className="-mt-3 text-center text-meta text-ink-3 normal-case tracking-normal">
          Hidden categories keep their past entries.
        </p>
      )}
    </form>
  )
}
