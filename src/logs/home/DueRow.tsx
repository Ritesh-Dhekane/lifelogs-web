// One row of the due list: what, when, and (for care) a Done button.

import { FileText, Leaf, ShieldCheck, Wrench } from 'lucide-react'
import { createElement } from 'react'
import { Link } from 'react-router'

import type { CareTask } from '../../data/db'
import { CareDoneButton } from './CareDoneButton'
import { dueText, type DueItem, type DueSource } from './stats'

const SOURCE_ICON: Record<DueSource, typeof FileText> = {
  document: FileText,
  warranty: ShieldCheck,
  service: Wrench,
  care: Leaf,
}

export function DueRow({
  item,
  task,
  today,
  now,
}: {
  item: DueItem
  task: CareTask | undefined
  today: string
  now: Date
}) {
  const text = dueText(item, today)
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link to={item.to} className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full ${
            item.overdue ? 'bg-danger/10 text-danger' : 'bg-home/12 text-home-ink'
          }`}
        >
          {createElement(SOURCE_ICON[item.source], { className: 'size-4', 'aria-hidden': true })}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body">{item.title}</span>
          <span
            className={`block text-label ${item.overdue ? 'font-medium text-danger' : 'text-ink-2'}`}
          >
            {text}
          </span>
        </span>
      </Link>
      {task && <CareDoneButton task={task} now={now} />}
    </div>
  )
}
