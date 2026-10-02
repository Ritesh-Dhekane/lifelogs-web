// Home › Care: repeat jobs for plants, pets and the home, with when each is next due.

import { useLiveQuery } from 'dexie-react-hooks'
import { Leaf, Plus } from 'lucide-react'
import { createElement, useState } from 'react'
import { useSearchParams } from 'react-router'

import { Card, EmptyState, SectionLabel } from '../../components/ui'
import type { CareTask } from '../../data/db'
import { listCareTasks } from '../../data/care'
import { daysBetween, relativeDay, toDay } from '../../lib/days'
import { CareDoneButton } from './CareDoneButton'
import { CareSheet } from './CareSheet'
import { CARE_GROUPS } from './labels'
import { careNextDue } from './stats'

export function CarePage() {
  const tasks = useLiveQuery(listCareTasks)
  const [params, setParams] = useSearchParams()
  const [now] = useState(() => new Date())
  const [editing, setEditing] = useState<CareTask | null>(null)
  const adding = params.get('add') === '1'

  if (!tasks) return null
  const today = toDay(now)

  function close() {
    setEditing(null)
    if (adding) setParams({}, { replace: true })
  }

  return (
    <div className="flex flex-col gap-2 pb-16">
      {tasks.length === 0 ? (
        <EmptyState
          icon={Leaf}
          title="No care tasks yet"
          text="Watering plants, feeding or deworming pets, cleaning filters — add the jobs that repeat and tick them off when done."
          action={
            <button
              type="button"
              onClick={() => setParams({ add: '1' }, { replace: true })}
              className="h-11 rounded-full bg-accent px-5 font-semibold text-on-accent"
            >
              Add a task
            </button>
          }
        />
      ) : (
        CARE_GROUPS.map((group) => {
          const list = tasks
            .filter((t) => t.group === group.value)
            .sort((a, b) => careNextDue(a).localeCompare(careNextDue(b)))
          if (list.length === 0) return null
          return (
            <section key={group.value}>
              <SectionLabel>{group.label}</SectionLabel>
              <Card as="div" className="flex flex-col divide-y divide-line px-0 py-1">
                {list.map((task) => {
                  const next = careNextDue(task)
                  const overdue = next < today
                  return (
                    <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditing(task)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-home/12 text-home-ink">
                          {createElement(group.icon, { className: 'size-4', 'aria-hidden': true })}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-body">{task.name}</span>
                          <span
                            className={`block text-label ${overdue ? 'font-medium text-danger' : 'text-ink-2'}`}
                          >
                            {overdue
                              ? `Overdue by ${daysBetween(next, today)} ${daysBetween(next, today) === 1 ? 'day' : 'days'}`
                              : next === today
                                ? 'Due today'
                                : `Next ${relativeDay(next, today).toLowerCase()}`}
                            {' · every '}
                            {task.everyDays === 1 ? 'day' : `${task.everyDays} days`}
                          </span>
                        </span>
                      </button>
                      <CareDoneButton task={task} now={now} />
                    </div>
                  )
                })}
              </Card>
            </section>
          )
        })
      )}

      {tasks.length > 0 && (
        <button
          type="button"
          onClick={() => setParams({ add: '1' }, { replace: true })}
          className="fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-on-accent shadow-float active:scale-95 lg:bottom-8"
        >
          <Plus className="size-5" /> Add task
        </button>
      )}

      <CareSheet open={adding || editing !== null} onClose={close} task={editing} />
    </div>
  )
}
