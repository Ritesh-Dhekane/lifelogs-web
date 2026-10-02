// Header + section tabs for a log (Expenses, Home); the tab content is the nested route.

import { Outlet, useLocation, useNavigate } from 'react-router'

import { getLog, type LogId } from '../logs/registry'
import { LogBadge, Segmented } from './ui'

export function LogLayout({
  log: id,
  tabs,
}: {
  log: LogId
  tabs: readonly { value: string; label: string }[]
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const log = getLog(id)
  const base = log.path ?? `/${id}`
  const tab = tabs.find((t) => pathname.startsWith(`${base}/${t.value}`))?.value ?? tabs[0]!.value

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-1">
        <LogBadge icon={log.icon} colorClass={log.color.text} softClass={log.color.soft} />
        <h1 className="text-title">{log.name}</h1>
      </div>
      {tabs.length > 1 && (
        <Segmented
          label={`${log.name} sections`}
          options={tabs.map((t) => ({ value: t.value, label: t.label }))}
          value={tab}
          onChange={(value) => navigate(`${base}/${value}`)}
        />
      )}
      <Outlet />
    </div>
  )
}
