// Lift's own header and Weight / Workouts / Stats tabs; the tab content is the nested route.

import { Outlet, useLocation, useNavigate } from 'react-router'

import { LogBadge, Segmented } from '../../components/ui'
import { getLog } from '../registry'

const TABS = [
  { value: 'weight', label: 'Weight' },
  { value: 'workouts', label: 'Workouts' },
  { value: 'stats', label: 'Stats' },
  { value: 'photos', label: 'Photos' },
] as const

type Tab = (typeof TABS)[number]['value']

export function LiftLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const log = getLog('lift')
  const tab = (TABS.find((t) => pathname.startsWith(`/lift/${t.value}`))?.value ?? 'weight') as Tab

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-1">
        <LogBadge icon={log.icon} colorClass={log.color.text} softClass={log.color.soft} />
        <h1 className="text-title">{log.name}</h1>
      </div>
      <Segmented
        label="Lift sections"
        options={TABS.map((t) => ({ value: t.value, label: t.label }))}
        value={tab}
        onChange={(value) => navigate(`/lift/${value}`)}
      />
      <Outlet />
    </div>
  )
}
