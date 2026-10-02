// Add or edit a care task, and see (or remove) when it was done.

import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Sheet } from '../../components/Sheet'
import { Segmented } from '../../components/ui'
import type { CareGroup, CareTask } from '../../data/db'
import {
  addCareTask,
  deleteCareLog,
  deleteCareTask,
  listCareLogs,
  updateCareTask,
} from '../../data/care'
import { dateTimeLabel } from '../../lib/dates'
import { toDay } from '../../lib/days'
import { CARE_GROUPS } from './labels'

const QUICK_DAYS = [1, 3, 7, 14, 30, 90]

export function CareSheet({
  open,
  onClose,
  task,
}: {
  open: boolean
  onClose: () => void
  task: CareTask | null
}) {
  return (
    <Sheet open={open} onClose={onClose} title={task ? task.name : 'New care task'}>
      {open && <CareForm key={task?.id ?? 'new'} task={task} onDone={onClose} />}
    </Sheet>
  )
}

function CareForm({ task, onDone }: { task: CareTask | null; onDone: () => void }) {
  const [name, setName] = useState(task?.name ?? '')
  const [group, setGroup] = useState<CareGroup>(task?.group ?? 'plant')
  const [everyDays, setEveryDays] = useState(String(task?.everyDays ?? 7))
  const [startOn, setStartOn] = useState(() => task?.startOn ?? toDay(new Date()))
  const [note, setNote] = useState(task?.note ?? '')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const history = useLiveQuery(() => (task ? listCareLogs(task.id) : []), [task?.id])

  async function save(event: FormEvent) {
    event.preventDefault()
    const input = { name, group, everyDays: Number(everyDays), startOn, note }
    try {
      if (task) await updateCareTask(task.id, input)
      else await addCareTask(input)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.")
    }
  }

  async function remove() {
    if (!task) return
    await deleteCareTask(task.id)
    onDone()
  }

  const field =
    'h-12 w-full rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent'
  const placeholder =
    group === 'plant'
      ? 'e.g. Water the monstera'
      : group === 'pet'
        ? 'e.g. Deworm Bruno'
        : 'e.g. Clean the AC filter'

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <Segmented<CareGroup>
        label="For"
        value={group}
        onChange={setGroup}
        options={CARE_GROUPS.map((g) => ({ value: g.value, label: g.label }))}
      />

      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">What</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          maxLength={60}
          placeholder={placeholder}
          data-autofocus={task ? undefined : true}
          className={field}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 px-1 text-label font-medium text-ink-2">Every</legend>
        <div className="flex flex-wrap gap-2">
          {QUICK_DAYS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setEveryDays(String(days))}
              aria-pressed={Number(everyDays) === days}
              className={`h-9 rounded-full px-3 text-label font-medium ${
                Number(everyDays) === days ? 'bg-accent text-on-accent' : 'bg-card-2'
              }`}
            >
              {days === 1 ? 'Day' : days === 7 ? 'Week' : days === 30 ? 'Month' : `${days} days`}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-card-2 px-4 focus-within:ring-2 focus-within:ring-accent">
          <input
            inputMode="numeric"
            value={everyDays}
            onChange={(e) => setEveryDays(e.target.value.replace(/\D/g, ''))}
            aria-label="Every so many days"
            className="h-12 w-full bg-transparent text-body tnum outline-none"
          />
          <span className="text-label text-ink-2">days</span>
        </label>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">
          {task?.lastDoneAt ? 'First due date' : 'Due first on'}
        </span>
        <input
          type="date"
          value={startOn}
          onChange={(e) => setStartOn(e.target.value)}
          className={field}
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex justify-between px-1 text-label font-medium text-ink-2">
          Note <span className="font-normal text-ink-3">Optional</span>
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="e.g. 500 ml, let the soil dry first"
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

      {task && history && history.length > 0 && (
        <section aria-labelledby="care-history">
          <h3 id="care-history" className="mb-2 px-1 text-label font-medium text-ink-2">
            Done
          </h3>
          <ul className="flex flex-col divide-y divide-line rounded-xl bg-card-2 px-3">
            {history.slice(0, 10).map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-2 text-label">
                <span>
                  {dateTimeLabel(log.doneAt)}
                  {log.note ? ` · ${log.note}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => deleteCareLog(log.id)}
                  className="grid size-8 place-items-center rounded-full text-ink-2"
                  aria-label={`Remove ${dateTimeLabel(log.doneAt)}`}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {task &&
        (confirmDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
            <span className="text-label">Delete this task?</span>
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
            <Trash2 className="size-4" /> Delete task
          </button>
        ))}
    </form>
  )
}
