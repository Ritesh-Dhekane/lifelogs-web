// Home on the Today screen: the most urgent things due this week; care tasks can be ticked off.

import { CalendarCheck, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Card, LogBadge } from '../../components/ui'
import { addDays, toDay } from '../../lib/days'
import { getLog } from '../registry'
import { DueRow } from './DueRow'
import { useDue } from './useDue'

const SHOWN = 4

export function HomeTodayCard() {
  const [now] = useState(() => new Date())
  const today = toDay(now)
  const due = useDue(today)
  const log = getLog('home')

  if (!due)
    return (
      <Card className="h-32 animate-pulse" aria-label="Home">
        {null}
      </Card>
    )

  const week = addDays(today, 7)
  const urgent = due.items.filter((i) => i.overdue || i.day <= week)

  return (
    <Card aria-label="Home" className="flex flex-col gap-3 pb-2">
      <Link to="/home" className="flex items-center gap-3">
        <LogBadge icon={log.icon} colorClass={log.color.text} softClass={log.color.soft} />
        <span className="flex-1">
          <span className="block text-heading">Home</span>
          <span className="text-label text-ink-2">
            {urgent.length === 0
              ? 'Nothing due this week'
              : `${urgent.length} ${urgent.length === 1 ? 'thing' : 'things'} due this week`}
          </span>
        </span>
        <ChevronRight className="size-5 text-ink-3" />
      </Link>
      {urgent.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-card-2 px-3 py-3 text-label text-ink-2">
          <CalendarCheck className="size-4" />
          {due.empty ? 'Add documents, vehicles or care tasks to get reminders.' : 'All clear.'}
        </p>
      ) : (
        <div className="-mx-4 flex flex-col divide-y divide-line">
          {urgent.slice(0, SHOWN).map((item) => (
            <DueRow
              key={item.id}
              item={item}
              task={item.careTaskId ? due.tasks.get(item.careTaskId) : undefined}
              today={today}
              now={now}
            />
          ))}
          {urgent.length > SHOWN && (
            <Link to="/home/due" className="px-4 py-3 text-label font-medium text-accent">
              {urgent.length - SHOWN} more
            </Link>
          )}
        </div>
      )}
    </Card>
  )
}
