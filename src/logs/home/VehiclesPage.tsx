// Home › Vehicles: every vehicle with its mileage and service status.

import { useLiveQuery } from 'dexie-react-hooks'
import { Car, ChevronRight, Plus } from 'lucide-react'
import { createElement, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { Card, EmptyState } from '../../components/ui'
import type { Vehicle, VehicleLog } from '../../data/db'
import { listVehicleLogs, listVehicles } from '../../data/vehicles'
import { toDay } from '../../lib/days'
import { VEHICLE_TYPES } from './labels'
import { currentOdometer, mileage } from './stats'
import { ServiceBadge } from './ServiceBadge'
import { VehicleLogSheet } from './VehicleLogSheet'
import { VehicleSheet } from './VehicleSheet'

export function VehiclesPage() {
  const vehicles = useLiveQuery(listVehicles)
  const logs = useLiveQuery(() => listVehicleLogs())
  const [params, setParams] = useSearchParams()
  const [now] = useState(() => new Date())
  const [adding, setAdding] = useState(false)

  if (!vehicles || !logs) return null
  const quickAdd = params.get('add') // "fuel" from Quick add

  return (
    <div className="flex flex-col gap-3">
      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          text="Add your car or bike to track fuel, mileage and when the next service is due."
          action={
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="h-11 rounded-full bg-accent px-5 font-semibold text-on-accent"
            >
              Add vehicle
            </button>
          }
        />
      ) : (
        <>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              logs={logs.filter((l) => l.vehicleId === vehicle.id)}
              today={toDay(now)}
            />
          ))}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-card font-medium"
          >
            <Plus className="size-4" /> Add vehicle
          </button>
        </>
      )}

      <VehicleSheet open={adding} onClose={() => setAdding(false)} vehicle={null} />
      <VehicleLogSheet
        open={quickAdd === 'fuel' && vehicles.length > 0}
        onClose={() => setParams({}, { replace: true })}
        vehicles={vehicles}
        vehicleId={null}
        entry={null}
        startKind="fuel"
        lastOdometer={null}
      />
    </div>
  )
}

function VehicleCard({
  vehicle,
  logs,
  today,
}: {
  vehicle: Vehicle
  logs: VehicleLog[]
  today: string
}) {
  const type = VEHICLE_TYPES.find((t) => t.value === vehicle.type) ?? VEHICLE_TYPES[0]!
  const m = mileage(logs)
  const odometer = currentOdometer(logs)
  return (
    <Link to={`/home/vehicles/${vehicle.id}`} className="block">
      <Card as="div" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-home/12 text-home-ink">
            {createElement(type.icon, { className: 'size-5', 'aria-hidden': true })}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-heading">{vehicle.name}</span>
            <span className="text-label text-ink-2 tnum">
              {odometer !== null ? `${odometer.toLocaleString('en-IN')} km` : type.label}
            </span>
          </span>
          <ChevronRight className="size-5 text-ink-3" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-label">
          <span className="rounded-full bg-card-2 px-3 py-1 tnum">
            {m.averageKmPerL !== null
              ? `${m.averageKmPerL.toFixed(1)} km/L average`
              : 'Mileage after two full tanks'}
          </span>
          <ServiceBadge vehicle={vehicle} logs={logs} today={today} />
        </div>
      </Card>
    </Link>
  )
}
