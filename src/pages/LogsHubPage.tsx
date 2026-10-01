// Logs hub: every log, ready ones with an on/off switch, the rest marked "Coming soon".

import { ArrowRight, Lock } from 'lucide-react'
import { Link } from 'react-router'

import { Card, LogBadge, Toggle } from '../components/ui'
import { setPrefs, usePrefs } from '../lib/prefs'
import { LOGS, type LogDefinition } from '../logs/registry'

export function LogsHubPage() {
  const prefs = usePrefs()
  const ready = LOGS.filter((log) => log.status === 'ready')
  const active = ready.filter((log) => prefs.logs.enabled[log.id]).length

  function setEnabled(log: LogDefinition, enabled: boolean) {
    setPrefs((p) => ({
      ...p,
      logs: { ...p.logs, enabled: { ...p.logs.enabled, [log.id]: enabled } },
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <p className="flex items-center justify-between text-meta uppercase text-ink-3">
          <span>Your logs</span>
          <span className="rounded-full bg-card-2 px-2.5 py-1 normal-case tracking-normal">
            {active} of {LOGS.length} active
          </span>
        </p>
        <p className="mt-2 text-body text-ink-2">
          Track only what matters to you. Switch logs on or off anytime.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LOGS.map((log) => (
          <li key={log.id}>
            {log.status === 'ready' ? (
              <Card as="div" className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between">
                  <LogBadge
                    icon={log.icon}
                    colorClass={log.color.text}
                    softClass={log.color.soft}
                  />
                  <Toggle
                    checked={Boolean(prefs.logs.enabled[log.id])}
                    onChange={(on) => setEnabled(log, on)}
                    label={`${log.name} log`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-title">{log.name}</p>
                  <p className="mt-1 text-label text-ink-2">{log.tagline}</p>
                </div>
                {prefs.logs.enabled[log.id] && log.path && (
                  <Link
                    to={log.path}
                    className="flex items-center justify-between border-t border-line pt-3 text-label font-medium"
                  >
                    Open {log.name} <ArrowRight className="size-4" />
                  </Link>
                )}
              </Card>
            ) : (
              <div className="flex h-full flex-col gap-3 rounded-[18px] bg-card-2/70 p-4">
                <div className="flex items-start justify-between">
                  <LogBadge icon={log.icon} colorClass={log.color.text} softClass="bg-card" />
                  <span className="rounded-full bg-card px-2.5 py-1 text-label text-ink-2">
                    Coming soon
                  </span>
                </div>
                <div>
                  <p className="text-title text-ink/80">{log.name}</p>
                  <p className="mt-1 text-label text-ink-2">{log.tagline}</p>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Card className="flex items-start gap-3 bg-card-2/60">
        <Lock className="mt-0.5 size-5 shrink-0 text-ink-2" />
        <div>
          <p className="text-body font-semibold">Private by design</p>
          <p className="text-label text-ink-2">
            Every log is stored on this device. Backups go only where you choose.
          </p>
        </div>
      </Card>
    </div>
  )
}
