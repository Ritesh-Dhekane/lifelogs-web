// "Done" for a care task; if it was already done today, offers Undo instead.

import { Check, Undo2 } from 'lucide-react'

import type { CareTask } from '../../data/db'
import { deleteCareLog, listCareLogs, markCareDone } from '../../data/care'
import { sameDay } from '../../lib/dates'

export function CareDoneButton({ task, now }: { task: CareTask; now: Date }) {
  const doneToday = task.lastDoneAt !== null && sameDay(task.lastDoneAt, now)

  async function undo() {
    const [latest] = await listCareLogs(task.id)
    if (latest && sameDay(latest.doneAt, now)) await deleteCareLog(latest.id)
  }

  return doneToday ? (
    <button
      type="button"
      onClick={undo}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-3 text-label font-medium text-success"
      aria-label={`${task.name} done today. Undo`}
    >
      <Check className="size-4" strokeWidth={3} /> Done
      <Undo2 className="size-3.5 opacity-70" aria-hidden />
    </button>
  ) : (
    <button
      type="button"
      onClick={() => markCareDone(task.id)}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-card-2 px-3 text-label font-semibold"
      aria-label={`Mark ${task.name} done`}
    >
      <Check className="size-4" /> Done
    </button>
  )
}
