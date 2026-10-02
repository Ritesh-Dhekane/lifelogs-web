// Home's entries for the shared timeline: care done, vehicle entries and purchases.

import { listCareLogs, listCareTasks } from '../../data/care'
import { listThings } from '../../data/things'
import { listVehicleLogs, listVehicles } from '../../data/vehicles'
import { fromDay } from '../../lib/days'
import { formatMoney } from '../../lib/money'
import type { TimelineItem } from '../timeline'
import { VEHICLE_LOG_LABEL } from './labels'

export async function homeTimeline(): Promise<TimelineItem[]> {
  const [careLogs, careTasks, vehicleLogs, vehicles, things] = await Promise.all([
    listCareLogs(),
    listCareTasks(),
    listVehicleLogs(),
    listVehicles(),
    listThings(),
  ])
  const taskName = new Map(careTasks.map((t) => [t.id, t.name]))
  const vehicleName = new Map(vehicles.map((v) => [v.id, v.name]))

  const care: TimelineItem[] = careLogs
    .filter((l) => taskName.has(l.taskId))
    .map((l) => ({
      id: `care-${l.id}`,
      log: 'home',
      at: l.doneAt,
      title: taskName.get(l.taskId)!,
      detail: 'Done',
      quote: l.note ?? undefined,
      to: '/home/care',
      searchText: ['care', 'done', taskName.get(l.taskId)!, l.note ?? ''].join(' ').toLowerCase(),
    }))

  const driving: TimelineItem[] = vehicleLogs
    .filter((l) => vehicleName.has(l.vehicleId))
    .map((l) => {
      const name = vehicleName.get(l.vehicleId)!
      const parts = [
        VEHICLE_LOG_LABEL[l.kind],
        l.litres ? `${l.litres} L` : null,
        l.odometerKm !== null ? `${l.odometerKm.toLocaleString('en-IN')} km` : null,
        l.costMinor ? formatMoney(l.costMinor) : null,
      ].filter(Boolean)
      return {
        id: `vehicle-${l.id}`,
        log: 'home',
        at: l.at,
        title: name,
        detail: parts.join(' · '),
        quote: l.note ?? undefined,
        to: `/home/vehicles/${l.vehicleId}`,
        searchText: ['vehicle', l.kind, name, l.note ?? ''].join(' ').toLowerCase(),
      }
    })

  const bought: TimelineItem[] = things
    .filter((t) => t.kind === 'item' && t.boughtOn)
    .map((t) => {
      const at = fromDay(t.boughtOn!)
      at.setHours(12)
      return {
        id: `thing-${t.id}`,
        log: 'home',
        at: at.toISOString(),
        title: `Bought ${t.name}`,
        detail: t.priceMinor ? formatMoney(t.priceMinor) : undefined,
        to: `/home/things?open=${t.id}`,
        searchText: ['bought', 'item', t.name, t.place ?? ''].join(' ').toLowerCase(),
      }
    })

  return [...care, ...driving, ...bought]
}
