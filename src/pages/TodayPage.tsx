// Today: greeting, backup status, a card per enabled log, and a shortcut to switch logs on.

import { useLiveQuery } from 'dexie-react-hooks'
import { CloudOff, CloudUpload, Flame, PlusCircle } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { Link } from 'react-router'

import { db } from '../data/db'
import { getProfile } from '../data/repos'
import { describeBackup, useBackupStatus } from '../lib/backupStatus'
import { greeting } from '../lib/dates'
import { usePrefs } from '../lib/prefs'
import { loggingStreak } from '../lib/streak'
import { ExpensesTodayCard } from '../logs/expenses/ExpensesTodayCard'
import { HomeTodayCard } from '../logs/home/HomeTodayCard'
import { LiftTodayCard } from '../logs/lift/LiftTodayCard'
import { enabledLogs, type LogId } from '../logs/registry'

// Each log's Today card. A new log adds its card here.
const TODAY_CARDS: Partial<Record<LogId, ComponentType>> = {
  lift: LiftTodayCard,
  expenses: ExpensesTodayCard,
  home: HomeTodayCard,
}

async function loggedTimestamps(): Promise<string[]> {
  const [weights, workouts, expenses, careLogs, vehicleLogs] = await Promise.all([
    db.weights.toArray(),
    db.workouts.toArray(),
    db.expenses.toArray(),
    db.careLogs.toArray(),
    db.vehicleLogs.toArray(),
  ])
  return [
    ...weights.filter((w) => !w.deletedAt).map((w) => w.recordedAt),
    ...workouts.filter((w) => !w.deletedAt && w.endedAt).map((w) => w.startedAt),
    ...expenses.filter((e) => !e.deletedAt && !e.recurringId).map((e) => e.spentAt),
    ...careLogs.map((l) => l.doneAt),
    ...vehicleLogs.filter((l) => !l.deletedAt).map((l) => l.at),
  ]
}

export function TodayPage() {
  const prefs = usePrefs()
  const profile = useLiveQuery(getProfile)
  const timestamps = useLiveQuery(loggedTimestamps)
  const backup = useBackupStatus()
  const [now] = useState(() => new Date())
  const logs = enabledLogs(prefs)
  const streak = timestamps ? loggingStreak(timestamps, now) : 0
  const firstName = profile?.name?.trim().split(/\s+/)[0]

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1 px-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-meta uppercase text-ink-2">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <Link
            to="/backup"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label ${
              backup ? 'bg-card-2 text-ink-2' : 'bg-lift/10 text-lift-ink'
            }`}
          >
            {backup ? <CloudUpload className="size-3.5" /> : <CloudOff className="size-3.5" />}
            {describeBackup(backup)}
          </Link>
        </div>
        <h1 className="text-display">
          {greeting(now)}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        {streak > 0 && (
          <p className="flex items-center gap-1.5 text-label text-ink-2">
            <Flame className="size-4 text-lift" />
            <strong className="text-ink tnum">{streak}</strong> {streak === 1 ? 'day' : 'days'} in a
            row with something logged
          </p>
        )}
      </header>

      {logs.map((log) => {
        const Card = TODAY_CARDS[log.id]
        return Card ? <Card key={log.id} /> : null
      })}

      <Link to="/logs" className="flex items-center gap-3 rounded-[18px] bg-card-2/70 p-4">
        <PlusCircle className="size-6 shrink-0 text-ink-2" />
        <span className="flex-1">
          <span className="block text-body font-semibold">
            {logs.length === 0 ? 'Switch on a log to get started' : 'Customize your day'}
          </span>
          <span className="text-label text-ink-2">
            Switch logs on or off, and see what's coming next
          </span>
        </span>
        <span className="text-label font-medium text-accent">Logs</span>
      </Link>
    </div>
  )
}
