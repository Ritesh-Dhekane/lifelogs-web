// The "+" button: every enabled log's quickest actions in one sheet.

import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router'

import { quickActions } from '../logs/actions'
import { enabledLogs } from '../logs/registry'
import { usePrefs } from '../lib/prefs'
import { Sheet } from './Sheet'
import { LogBadge } from './ui'

export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const prefs = usePrefs()
  const navigate = useNavigate()
  const logs = enabledLogs(prefs)

  return (
    <Sheet open={open} onClose={onClose} title="Quick add">
      <div className="flex flex-col gap-5 pb-2">
        {logs.length === 0 && (
          <p className="py-6 text-center text-label text-ink-2">
            No logs are switched on. Turn one on in Manage logs.
          </p>
        )}
        {logs.map((log) => (
          <section key={log.id} aria-labelledby={`quick-${log.id}`}>
            <h3
              id={`quick-${log.id}`}
              className="mb-2 flex items-center gap-2 text-meta uppercase text-ink-3"
            >
              <span className={`size-2 rounded-full ${log.color.bg}`} />
              {log.name}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions(log.id).map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate(action.to)
                  }}
                  className="flex flex-col items-start gap-3 rounded-[18px] bg-card-2 p-4 text-left transition-transform active:scale-[0.98]"
                >
                  <LogBadge icon={action.icon} colorClass={log.color.text} softClass="bg-card" />
                  <span>
                    <span className="block text-body font-semibold">{action.label}</span>
                    <span className="flex items-center gap-1 text-label text-ink-2">
                      {action.hint} <ChevronRight className="size-3.5" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  )
}
