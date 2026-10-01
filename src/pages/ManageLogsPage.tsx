// Manage logs: switch ready logs on/off and set their order (Today, Insights, Quick add follow it).

import { ArrowDown, ArrowUp } from 'lucide-react'

import { Card, LogBadge, SectionLabel, Toggle } from '../components/ui'
import { setPrefs, usePrefs } from '../lib/prefs'
import { LOGS, type LogId } from '../logs/registry'

export function ManageLogsPage() {
  const prefs = usePrefs()
  const ready = LOGS.filter((log) => log.status === 'ready')
  const order = [...ready].sort(
    (a, b) => rank(prefs.logs.order, a.id) - rank(prefs.logs.order, b.id),
  )
  const soon = LOGS.filter((log) => log.status === 'soon')

  function move(id: LogId, delta: number) {
    const ids = order.map((log) => log.id)
    const from = ids.indexOf(id)
    const to = from + delta
    if (to < 0 || to >= ids.length) return
    ids.splice(to, 0, ids.splice(from, 1)[0]!)
    setPrefs((p) => ({ ...p, logs: { ...p.logs, order: ids } }))
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      <SectionLabel>Your logs</SectionLabel>
      <Card className="flex flex-col divide-y divide-line py-1">
        {order.map((log, i) => (
          <div key={log.id} className="flex items-center gap-3 py-3">
            <LogBadge
              icon={log.icon}
              colorClass={log.color.text}
              softClass={log.color.soft}
              size="sm"
            />
            <span className="flex-1 text-body font-medium">{log.name}</span>
            <button
              type="button"
              onClick={() => move(log.id, -1)}
              disabled={i === 0}
              className="grid size-9 place-items-center rounded-full disabled:opacity-25"
              aria-label={`Move ${log.name} up`}
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(log.id, 1)}
              disabled={i === order.length - 1}
              className="grid size-9 place-items-center rounded-full disabled:opacity-25"
              aria-label={`Move ${log.name} down`}
            >
              <ArrowDown className="size-4" />
            </button>
            <Toggle
              label={`${log.name} log`}
              checked={Boolean(prefs.logs.enabled[log.id])}
              onChange={(on) =>
                setPrefs((p) => ({
                  ...p,
                  logs: { ...p.logs, enabled: { ...p.logs.enabled, [log.id]: on } },
                }))
              }
            />
          </div>
        ))}
      </Card>
      <p className="px-1 text-label text-ink-2">
        The order here is the order on Today, in Insights and in Quick add. Turning a log off hides
        it; its data stays on your device.
      </p>

      <SectionLabel>Coming soon</SectionLabel>
      <Card className="flex flex-col divide-y divide-line py-1">
        {soon.map((log) => (
          <div key={log.id} className="flex items-center gap-3 py-3">
            <LogBadge
              icon={log.icon}
              colorClass={log.color.text}
              softClass={log.color.soft}
              size="sm"
            />
            <span className="flex-1 text-body">{log.name}</span>
            <span className="text-label text-ink-3">Soon</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

function rank(order: string[], id: string): number {
  const index = order.indexOf(id)
  return index === -1 ? 1000 + LOGS.findIndex((log) => log.id === id) : index
}
