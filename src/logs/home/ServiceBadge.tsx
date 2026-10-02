// A small chip with a vehicle's service status: "Service in 300 km", "Service overdue".

import { Wrench } from 'lucide-react'

import type { Vehicle, VehicleLog } from '../../data/db'
import { relativeDay } from '../../lib/days'
import { serviceStatus } from './stats'

export function ServiceBadge({
  vehicle,
  logs,
  today,
}: {
  vehicle: Vehicle
  logs: VehicleLog[]
  today: string
}) {
  const status = serviceStatus(vehicle, logs, today)
  if (status.state === 'unknown') return null
  // "Service in 300 km or by Jan 10", "Service in 5 days", "Service overdue".
  const parts: string[] = []
  if (status.kmLeft !== null) {
    parts.push(`in ${Math.abs(Math.round(status.kmLeft)).toLocaleString('en-IN')} km`)
  }
  if (status.dueOn) {
    const when = relativeDay(status.dueOn, today)
    parts.push(/^(In |Today|Tomorrow)/.test(when) ? when.toLowerCase() : `by ${when}`)
  }
  const text = status.state === 'overdue' ? 'Service overdue' : `Service ${parts.join(' or ')}`
  const tone =
    status.state === 'overdue'
      ? 'bg-danger/10 text-danger'
      : status.state === 'soon'
        ? 'bg-home/12 text-home-ink'
        : 'bg-card-2 text-ink-2'
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${tone}`}>
      <Wrench className="size-3.5" aria-hidden /> {text}
    </span>
  )
}
