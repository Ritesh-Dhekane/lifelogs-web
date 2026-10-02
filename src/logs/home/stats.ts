// Pure calculations for the Home log: care due dates, vehicle mileage and service, and the one
// "due soon" list that brings documents, warranties, services and care together.

import type { CareTask, Thing, Vehicle, VehicleLog } from '../../data/db'
import { addDays, addMonthsToDay, daysBetween, relativeDay, toDay } from '../../lib/days'

// ---------- Care ----------

export function careNextDue(task: Pick<CareTask, 'lastDoneAt' | 'everyDays' | 'startOn'>): string {
  if (!task.lastDoneAt) return task.startOn
  return addDays(toDay(new Date(task.lastDoneAt)), task.everyDays)
}

// ---------- Vehicles ----------

export interface Mileage {
  averageKmPerL: number | null // over every measured stretch
  lastKmPerL: number | null // the most recent full-tank to full-tank stretch
  distanceKm: number // between the first and last odometer reading
  fuelCostMinor: number // all fuel ever logged
  costPerKmMinor: number | null // fuel cost of the measured stretches ÷ their distance
}

// Full-tank method: from one full tank to the next, distance ÷ litres put in since (including
// any partial fills in between). Entries without an odometer reading are skipped.
export function mileage(logs: VehicleLog[]): Mileage {
  const fills = logs
    .filter((l) => l.kind === 'fuel' && l.odometerKm !== null && l.litres)
    .sort((a, b) => a.odometerKm! - b.odometerKm! || a.at.localeCompare(b.at))
  let distance = 0
  let litres = 0
  let cost = 0
  let last: number | null = null
  let previousFull: VehicleLog | null = null
  let since = 0
  let sinceCost = 0
  for (const fill of fills) {
    if (previousFull) {
      since += fill.litres!
      sinceCost += fill.costMinor ?? 0
    }
    if (fill.fullTank) {
      if (previousFull && since > 0) {
        const km = fill.odometerKm! - previousFull.odometerKm!
        if (km > 0) {
          distance += km
          litres += since
          cost += sinceCost
          last = km / since
        }
      }
      previousFull = fill
      since = 0
      sinceCost = 0
    }
  }
  const readings = logs.map((l) => l.odometerKm).filter((v): v is number => v !== null)
  return {
    averageKmPerL: litres > 0 ? distance / litres : null,
    lastKmPerL: last,
    distanceKm: readings.length ? Math.max(...readings) - Math.min(...readings) : 0,
    fuelCostMinor: logs
      .filter((l) => l.kind === 'fuel')
      .reduce((s, l) => s + (l.costMinor ?? 0), 0),
    costPerKmMinor: distance > 0 && cost > 0 ? cost / distance : null,
  }
}

export function currentOdometer(logs: VehicleLog[]): number | null {
  const readings = logs.map((l) => l.odometerKm).filter((v): v is number => v !== null)
  return readings.length ? Math.max(...readings) : null
}

export interface ServiceStatus {
  lastService: VehicleLog | null
  dueOn: string | null // by months
  dueAtKm: number | null // by distance
  daysLeft: number | null
  kmLeft: number | null
  state: 'ok' | 'soon' | 'overdue' | 'unknown'
}

const SOON_DAYS = 14
const SOON_KM = 500

export function serviceStatus(vehicle: Vehicle, logs: VehicleLog[], today: string): ServiceStatus {
  const lastService =
    logs.filter((l) => l.kind === 'service').sort((a, b) => b.at.localeCompare(a.at))[0] ?? null
  if (!lastService || (!vehicle.serviceEveryKm && !vehicle.serviceEveryMonths)) {
    return {
      lastService,
      dueOn: null,
      dueAtKm: null,
      daysLeft: null,
      kmLeft: null,
      state: 'unknown',
    }
  }
  const dueOn = vehicle.serviceEveryMonths
    ? addMonthsToDay(toDay(new Date(lastService.at)), vehicle.serviceEveryMonths)
    : null
  const dueAtKm =
    vehicle.serviceEveryKm && lastService.odometerKm !== null
      ? lastService.odometerKm + vehicle.serviceEveryKm
      : null
  const odometer = currentOdometer(logs)
  const daysLeft = dueOn ? daysBetween(today, dueOn) : null
  const kmLeft = dueAtKm !== null && odometer !== null ? dueAtKm - odometer : null
  const overdue = (daysLeft !== null && daysLeft < 0) || (kmLeft !== null && kmLeft < 0)
  const soon =
    (daysLeft !== null && daysLeft <= SOON_DAYS) || (kmLeft !== null && kmLeft <= SOON_KM)
  return {
    lastService,
    dueOn,
    dueAtKm,
    daysLeft,
    kmLeft,
    state: overdue ? 'overdue' : soon ? 'soon' : 'ok',
  }
}

// ---------- Due soon ----------

export type DueSource = 'document' | 'warranty' | 'service' | 'care'

export interface DueItem {
  id: string
  source: DueSource
  title: string
  detail: string
  day: string // when it's due / expires
  overdue: boolean
  to: string
  careTaskId?: string // care items can be ticked off in place
}

export const DUE_HORIZON_DAYS = 30

export function dueItems(
  data: {
    things: Thing[]
    vehicles: Vehicle[]
    vehicleLogs: VehicleLog[]
    careTasks: CareTask[]
  },
  today: string,
): DueItem[] {
  const items: DueItem[] = []

  for (const thing of data.things) {
    if (!thing.expiresOn) continue
    const left = daysBetween(today, thing.expiresOn)
    if (thing.kind === 'document') {
      // Documents: from their reminder window on, and still after they've expired.
      if (left > Math.max(thing.remindDays, 0)) continue
      items.push({
        id: `thing-${thing.id}`,
        source: 'document',
        title: thing.name,
        detail: left < 0 ? 'Expired' : 'Expires',
        day: thing.expiresOn,
        overdue: left < 0,
        to: `/home/things?open=${thing.id}`,
      })
    } else if (left >= 0 && left <= Math.max(thing.remindDays, 0)) {
      // Warranties only matter until they end.
      items.push({
        id: `thing-${thing.id}`,
        source: 'warranty',
        title: thing.name,
        detail: 'Warranty ends',
        day: thing.expiresOn,
        overdue: false,
        to: `/home/things?open=${thing.id}`,
      })
    }
  }

  for (const vehicle of data.vehicles) {
    if (vehicle.archived) continue
    const logs = data.vehicleLogs.filter((l) => l.vehicleId === vehicle.id)
    const status = serviceStatus(vehicle, logs, today)
    if (status.state !== 'soon' && status.state !== 'overdue') continue
    const byKm = status.kmLeft !== null ? `${Math.abs(Math.round(status.kmLeft))} km` : null
    items.push({
      id: `service-${vehicle.id}`,
      source: 'service',
      title: `${vehicle.name} service`,
      detail:
        status.state === 'overdue'
          ? `Overdue${byKm && status.kmLeft! < 0 ? ` by ${byKm}` : ''}`
          : `Due${byKm ? ` in ${byKm}` : ''}`,
      // When distance is what makes it due, there's no date: it's due now.
      day:
        (status.kmLeft !== null && status.kmLeft <= SOON_KM) || !status.dueOn
          ? today
          : status.dueOn,
      overdue: status.state === 'overdue',
      to: `/home/vehicles/${vehicle.id}`,
    })
  }

  const horizon = addDays(today, DUE_HORIZON_DAYS)
  for (const task of data.careTasks) {
    if (task.archived) continue
    const next = careNextDue(task)
    if (next > horizon) continue
    items.push({
      id: `care-${task.id}`,
      source: 'care',
      title: task.name,
      detail: `Every ${task.everyDays === 1 ? 'day' : `${task.everyDays} days`}`,
      day: next,
      overdue: next < today,
      to: '/home/care',
      careTaskId: task.id,
    })
  }

  return items.sort((a, b) => a.day.localeCompare(b.day) || a.title.localeCompare(b.title))
}

// ---------- Things ----------

// "Expires in 20 days", "Expired 3 days ago", "Warranty until Oct 20, 2027".
export function expiryText(thing: Thing, today: string): { text: string; urgent: boolean } | null {
  if (!thing.expiresOn) return null
  const left = daysBetween(today, thing.expiresOn)
  const when = relativeDay(thing.expiresOn, today)
  if (thing.kind === 'document') {
    if (left < 0) return { text: `Expired ${when.toLowerCase()}`, urgent: true }
    return {
      text: left < 14 ? `Expires ${when.toLowerCase()}` : `Expires ${when}`,
      urgent: left <= thing.remindDays,
    }
  }
  if (left < 0) return { text: 'Warranty over', urgent: false }
  return { text: `Warranty until ${when}`, urgent: left <= thing.remindDays }
}

// ---------- Words ----------

// "today", "tomorrow", "in 5 days", "3 days ago", "on Mar 12".
function when(day: string, today: string): string {
  const rel = relativeDay(day, today)
  if (/^(Today|Tomorrow|Yesterday)$/.test(rel)) return rel.toLowerCase()
  if (rel.startsWith('In ') || rel.endsWith(' ago')) return rel.toLowerCase()
  return `on ${rel}`
}

// The second line of a due row: "Expires in 20 days", "Expired 3 days ago", "Overdue by 2 days".
export function dueText(item: DueItem, today: string): string {
  const late = daysBetween(item.day, today)
  switch (item.source) {
    case 'document':
      return item.overdue ? `Expired ${when(item.day, today)}` : `Expires ${when(item.day, today)}`
    case 'warranty':
      return `Warranty ends ${when(item.day, today)}`
    case 'service':
      return item.detail === 'Due' ? `Due ${when(item.day, today)}` : item.detail
    case 'care':
      if (item.overdue) return `Overdue by ${late} ${late === 1 ? 'day' : 'days'}`
      return item.day === today ? 'Due today' : `Due ${when(item.day, today)}`
  }
}
