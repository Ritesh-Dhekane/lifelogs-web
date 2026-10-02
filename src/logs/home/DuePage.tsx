// Home › Due: one list of what needs attention — expiring documents, ending warranties, vehicle
// services and care tasks — from overdue to a month ahead.

import { CalendarCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Card, EmptyState, SectionLabel } from '../../components/ui'
import { addDays, toDay } from '../../lib/days'
import { DueRow } from './DueRow'
import type { DueItem } from './stats'
import { useDue } from './useDue'

export function DuePage() {
  const [now] = useState(() => new Date())
  const today = toDay(now)
  const due = useDue(today)
  if (!due) return null

  const week = addDays(today, 7)
  const groups: { label: string; items: DueItem[] }[] = [
    { label: 'Overdue', items: due.items.filter((i) => i.overdue) },
    { label: 'Today', items: due.items.filter((i) => !i.overdue && i.day <= today) },
    { label: 'This week', items: due.items.filter((i) => i.day > today && i.day <= week) },
    { label: 'Later', items: due.items.filter((i) => i.day > week) },
  ]

  if (due.items.length === 0) {
    return due.empty ? (
      <EmptyState
        icon={CalendarCheck}
        title="Nothing to keep track of yet"
        text="Add documents with expiry dates, things under warranty, your vehicle and repeat jobs. What needs attention shows up here."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to="/home/things?add=document"
              className="flex h-11 items-center rounded-full bg-accent px-5 font-semibold text-on-accent"
            >
              Add document
            </Link>
            <Link
              to="/home/care?add=1"
              className="flex h-11 items-center rounded-full bg-card px-5 font-semibold"
            >
              Add care task
            </Link>
          </div>
        }
      />
    ) : (
      <EmptyState
        icon={CalendarCheck}
        title="All clear"
        text="Nothing is due in the next 30 days. Documents show up here from their reminder date."
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.label}>
            <SectionLabel>{group.label}</SectionLabel>
            <Card as="div" className="flex flex-col divide-y divide-line px-0 py-1">
              {group.items.map((item) => (
                <DueRow
                  key={item.id}
                  item={item}
                  task={item.careTaskId ? due.tasks.get(item.careTaskId) : undefined}
                  today={today}
                  now={now}
                />
              ))}
            </Card>
          </section>
        ),
      )}
      <p className="px-1 pt-2 text-label text-ink-2">
        Reminders show here and on Today when you open the app — there are no push notifications
        yet.
      </p>
    </div>
  )
}
