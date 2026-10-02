// One vehicle: mileage, running cost, service status and every entry.

import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Fuel, Gauge, Pencil, Receipt, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { Card, EmptyState, SectionLabel } from '../../components/ui'
import type { VehicleLog, VehicleLogKind } from '../../data/db'
import { getVehicle, listVehicleLogs, listVehicles } from '../../data/vehicles'
import { dayLabel } from '../../lib/dates'
import { relativeDay, toDay } from '../../lib/days'
import { formatMoney } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { VEHICLE_LOG_LABEL } from './labels'
import { ServiceBadge } from './ServiceBadge'
import { currentOdometer, mileage, serviceStatus } from './stats'
import { VehicleLogSheet } from './VehicleLogSheet'
import { VehicleSheet } from './VehicleSheet'

const KIND_ICON = { fuel: Fuel, service: Wrench, odometer: Gauge } as const

export function VehicleDetailPage() {
  const { id = '' } = useParams()
  const vehicle = useLiveQuery(() => getVehicle(id), [id])
  const vehicles = useLiveQuery(listVehicles)
  const logs = useLiveQuery(() => listVehicleLogs(id), [id])
  const { currency } = usePrefs()
  const [now] = useState(() => new Date())
  const [editingVehicle, setEditingVehicle] = useState(false)
  const [entry, setEntry] = useState<VehicleLog | null>(null)
  const [newKind, setNewKind] = useState<VehicleLogKind | null>(null)

  if (vehicle === undefined && vehicles !== undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-heading">This vehicle no longer exists</p>
        <Link to="/home/vehicles" className="text-label font-medium text-accent">
          Back to vehicles
        </Link>
      </div>
    )
  }
  if (!vehicle || !logs || !vehicles) return null

  const today = toDay(now)
  const m = mileage(logs)
  const odometer = currentOdometer(logs)
  const service = serviceStatus(vehicle, logs, today)
  const thisMonth = logs.filter(
    (l) => l.kind === 'fuel' && toDay(new Date(l.at)).slice(0, 7) === today.slice(0, 7),
  )
  const monthCost = thisMonth.reduce((s, l) => s + (l.costMinor ?? 0), 0)

  return (
    <div className="flex flex-col gap-3 pb-16">
      <div className="flex items-center justify-between">
        <Link to="/home/vehicles" className="flex items-center gap-1 text-label text-ink-2">
          <ChevronLeft className="size-4" /> Vehicles
        </Link>
        <button
          type="button"
          onClick={() => setEditingVehicle(true)}
          className="flex h-9 items-center gap-1.5 rounded-full bg-card px-3 text-label font-medium"
        >
          <Pencil className="size-3.5" /> Edit
        </button>
      </div>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-title">{vehicle.name}</h2>
          <p className="text-label text-ink-2 tnum">
            {odometer !== null
              ? `${odometer.toLocaleString('en-IN')} km on the clock`
              : 'No readings yet'}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <Stat
            label="Mileage"
            value={m.averageKmPerL !== null ? `${m.averageKmPerL.toFixed(1)} km/L` : '—'}
            hint={
              m.lastKmPerL !== null
                ? `Last tank ${m.lastKmPerL.toFixed(1)}`
                : 'After two full tanks'
            }
          />
          <Stat
            label="Fuel cost per km"
            value={
              m.costPerKmMinor !== null ? formatMoney(Math.round(m.costPerKmMinor), currency) : '—'
            }
            hint={`${m.distanceKm.toLocaleString('en-IN')} km logged`}
          />
          <Stat
            label="Fuel this month"
            value={formatMoney(monthCost, currency)}
            hint={`${thisMonth.length} ${thisMonth.length === 1 ? 'fill' : 'fills'}`}
          />
          <Stat
            label="Last service"
            value={
              service.lastService
                ? relativeDay(toDay(new Date(service.lastService.at)), today)
                : '—'
            }
            hint={
              vehicle.serviceEveryKm || vehicle.serviceEveryMonths
                ? 'Interval set'
                : 'No interval set'
            }
          />
        </dl>
        <div className="flex flex-wrap gap-2 text-label">
          <ServiceBadge vehicle={vehicle} logs={logs} today={today} />
          {service.state === 'unknown' && (
            <p className="text-label text-ink-2">
              {service.lastService
                ? 'Set a service interval (Edit) to get reminders.'
                : 'Log your last service to get reminders for the next one.'}
            </p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {(['fuel', 'service', 'odometer'] as const).map((kind) => {
          const Icon = KIND_ICON[kind]
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setNewKind(kind)}
              className="flex flex-col items-center gap-1 rounded-[18px] bg-card py-3 text-label font-medium active:scale-[0.98]"
            >
              <Icon className="size-5 text-home-ink" aria-hidden />
              {kind === 'odometer' ? 'Reading' : VEHICLE_LOG_LABEL[kind]}
            </button>
          )
        })}
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={Fuel}
          title="No entries yet"
          text="Log each fill with the odometer reading, and tick 'Filled to full' when you fill up — mileage appears after the second full tank."
        />
      ) : (
        <>
          <SectionLabel>History</SectionLabel>
          <Card as="div" className="flex flex-col divide-y divide-line px-0 py-1">
            {logs.map((log) => (
              <LogRow key={log.id} log={log} now={now} onOpen={() => setEntry(log)} />
            ))}
          </Card>
        </>
      )}

      <VehicleSheet
        open={editingVehicle}
        onClose={() => setEditingVehicle(false)}
        vehicle={vehicle}
      />
      <VehicleLogSheet
        open={entry !== null || newKind !== null}
        onClose={() => {
          setEntry(null)
          setNewKind(null)
        }}
        vehicles={vehicles}
        vehicleId={vehicle.id}
        entry={entry}
        startKind={newKind ?? 'fuel'}
        lastOdometer={odometer}
      />
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-card-2 p-3">
      <dt className="text-label text-ink-2">{label}</dt>
      <dd className="text-heading tnum">{value}</dd>
      <dd className="truncate text-label text-ink-2">{hint}</dd>
    </div>
  )
}

function LogRow({ log, now, onOpen }: { log: VehicleLog; now: Date; onOpen: () => void }) {
  const { currency } = usePrefs()
  const Icon = KIND_ICON[log.kind]
  const details = [
    log.odometerKm !== null ? `${log.odometerKm.toLocaleString('en-IN')} km` : null,
    log.litres ? `${log.litres} L${log.fullTank ? ' · full' : ''}` : null,
    log.note,
  ].filter(Boolean)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-card-2"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card-2">
        <Icon className="size-4 text-home-ink" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body">
          {VEHICLE_LOG_LABEL[log.kind]} · {dayLabel(log.at, now)}
        </span>
        <span className="block truncate text-label text-ink-2">{details.join(' · ')}</span>
      </span>
      {log.costMinor !== null && (
        <span className="flex items-center gap-1 text-body font-semibold tnum">
          {log.expenseId && <Receipt className="size-3.5 text-ink-3" aria-label="In Expenses" />}
          {formatMoney(log.costMinor, currency)}
        </span>
      )}
    </button>
  )
}
