// Add or edit a weight entry: value with fine steppers, condition, date & time (past allowed), note.

import { Droplets, Dumbbell, Sun, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Sheet } from '../../components/Sheet'
import { Segmented } from '../../components/ui'
import type { WeightEntry, WeightKind } from '../../data/db'
import { addWeight, deleteWeight, updateWeight } from '../../data/repos'
import { fromLocalInput, toLocalInput } from '../../lib/dates'
import { usePrefs } from '../../lib/prefs'
import { fromKg, round1, toKg } from '../../lib/units'

export function WeightSheet({
  open,
  onClose,
  entry,
  lastKg,
}: {
  open: boolean
  onClose: () => void
  entry: WeightEntry | null // null = new entry
  lastKg: number | null // prefill for new entries
}) {
  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Edit weight' : 'Log weight'}>
      {/* Remount per entry so the form starts from that entry's values. */}
      {open && (
        <WeightForm key={entry?.id ?? 'new'} entry={entry} lastKg={lastKg} onDone={onClose} />
      )}
    </Sheet>
  )
}

function WeightForm({
  entry,
  lastKg,
  onDone,
}: {
  entry: WeightEntry | null
  lastKg: number | null
  onDone: () => void
}) {
  const { units } = usePrefs()
  const unit = units.weight
  const startKg = entry?.weightKg ?? lastKg ?? 70
  const [value, setValue] = useState(String(round1(fromKg(startKg, unit))))
  const [kind, setKind] = useState<WeightKind>(entry?.kind ?? 'general')
  const [maxWhen] = useState(() => toLocalInput(new Date().toISOString()))
  const [when, setWhen] = useState(() =>
    toLocalInput(entry?.recordedAt ?? new Date().toISOString()),
  )
  const [note, setNote] = useState(entry?.note ?? '')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const number = Number(value.replace(',', '.'))
  const kg = Number.isFinite(number) ? toKg(number, unit) : NaN

  function step(delta: number) {
    const current = Number.isFinite(number) ? number : round1(fromKg(startKg, unit))
    setValue(String(round1(current + delta)))
    setError('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      setError(
        `Enter a weight between ${round1(fromKg(20, unit))} and ${round1(fromKg(400, unit))} ${unit}.`,
      )
      return
    }
    if (new Date(when).getTime() > Date.now() + 60_000) {
      setError("The date can't be in the future.")
      return
    }
    const input = { recordedAt: fromLocalInput(when), kind, weightKg: round1(kg * 100) / 100, note }
    if (entry) await updateWeight(entry.id, input)
    else await addWeight(input)
    onDone()
  }

  async function remove() {
    if (!entry) return
    await deleteWeight(entry.id)
    onDone()
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <div className="rounded-[18px] bg-card-2 px-4 py-5">
        <label className="flex items-baseline justify-center gap-2">
          <span className="sr-only">Weight in {unit}</span>
          <input
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setError('')
            }}
            className="w-40 bg-transparent text-center text-[56px] leading-none font-bold tracking-tight tnum outline-none"
            aria-invalid={Boolean(error)}
          />
          <span className="text-title text-ink-2">{unit}</span>
        </label>
        <div className="mt-4 flex justify-center gap-2">
          {[-0.5, -0.1, 0.1, 0.5].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => step(delta)}
              className="h-10 min-w-14 rounded-full bg-card px-3 text-label font-medium tnum active:scale-95"
              aria-label={`${delta > 0 ? 'Add' : 'Subtract'} ${Math.abs(delta)} ${unit}`}
            >
              {delta > 0 ? `+${delta}` : delta}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 px-1 text-label font-medium text-ink-2">Condition</p>
        <Segmented<WeightKind>
          label="Condition"
          value={kind}
          onChange={setKind}
          options={[
            {
              value: 'before_gym',
              label: (
                <>
                  <Dumbbell className="size-4" /> Before
                </>
              ),
            },
            {
              value: 'after_gym',
              label: (
                <>
                  <Droplets className="size-4" /> After
                </>
              ),
            },
            {
              value: 'general',
              label: (
                <>
                  <Sun className="size-4" /> General
                </>
              ),
            },
          ]}
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
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="How did you feel?"
          className="resize-none rounded-xl bg-card-2 px-4 py-3 text-body outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="h-12 rounded-full bg-accent font-semibold text-white active:scale-[0.98]"
      >
        Save
      </button>

      {entry &&
        (confirmDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
            <span className="text-label">Delete this entry?</span>
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
                className="h-9 rounded-full bg-danger px-4 text-label font-semibold text-white"
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
            <Trash2 className="size-4" /> Delete entry
          </button>
        ))}
    </form>
  )
}
