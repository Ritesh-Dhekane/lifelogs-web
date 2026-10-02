// Add or edit a vehicle and its service interval.

import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { Sheet } from '../../components/Sheet'
import { Segmented } from '../../components/ui'
import type { Vehicle, VehicleType } from '../../data/db'
import { addVehicle, deleteVehicle, updateVehicle } from '../../data/vehicles'
import { VEHICLE_TYPES } from './labels'

export function VehicleSheet({
  open,
  onClose,
  vehicle,
}: {
  open: boolean
  onClose: () => void
  vehicle: Vehicle | null
}) {
  return (
    <Sheet open={open} onClose={onClose} title={vehicle ? vehicle.name : 'New vehicle'}>
      {open && <VehicleForm key={vehicle?.id ?? 'new'} vehicle={vehicle} onDone={onClose} />}
    </Sheet>
  )
}

function VehicleForm({ vehicle, onDone }: { vehicle: Vehicle | null; onDone: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState(vehicle?.name ?? '')
  const [type, setType] = useState<VehicleType>(vehicle?.type ?? 'car')
  const [everyKm, setEveryKm] = useState(String(vehicle?.serviceEveryKm ?? ''))
  const [everyMonths, setEveryMonths] = useState(String(vehicle?.serviceEveryMonths ?? ''))
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    const input = {
      name,
      type,
      serviceEveryKm: everyKm.trim() ? Number(everyKm) : null,
      serviceEveryMonths: everyMonths.trim() ? Number(everyMonths) : null,
    }
    try {
      if (vehicle) await updateVehicle(vehicle.id, input)
      else {
        const created = await addVehicle(input)
        navigate(`/home/vehicles/${created.id}`)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.")
    }
  }

  async function remove() {
    if (!vehicle) return
    await deleteVehicle(vehicle.id)
    onDone()
    navigate('/home/vehicles')
  }

  const field =
    'h-12 w-full rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent'

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">Name</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          maxLength={60}
          placeholder="e.g. Swift or Activa"
          data-autofocus={vehicle ? undefined : true}
          className={field}
        />
      </label>

      <Segmented<VehicleType>
        size="sm"
        label="Type"
        value={type}
        onChange={setType}
        options={VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 px-1 text-label font-medium text-ink-2">
          Service every <span className="font-normal text-ink-3">· whichever comes first</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 rounded-xl bg-card-2 px-4 focus-within:ring-2 focus-within:ring-accent">
            <input
              inputMode="numeric"
              value={everyKm}
              onChange={(e) => setEveryKm(e.target.value.replace(/\D/g, ''))}
              placeholder="10000"
              aria-label="Service every so many km"
              className="h-12 w-full bg-transparent text-body tnum outline-none"
            />
            <span className="text-label text-ink-2">km</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl bg-card-2 px-4 focus-within:ring-2 focus-within:ring-accent">
            <input
              inputMode="numeric"
              value={everyMonths}
              onChange={(e) => setEveryMonths(e.target.value.replace(/\D/g, ''))}
              placeholder="12"
              aria-label="Service every so many months"
              className="h-12 w-full bg-transparent text-body tnum outline-none"
            />
            <span className="text-label text-ink-2">months</span>
          </label>
        </div>
        <p className="px-1 text-meta text-ink-3 normal-case tracking-normal">
          Check your owner's manual. Leave empty for no service reminders.
        </p>
      </fieldset>

      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="h-12 rounded-full bg-accent font-semibold text-on-accent active:scale-[0.98]"
      >
        Save
      </button>

      {vehicle &&
        (confirmDelete ? (
          <div className="flex flex-col gap-3 rounded-xl bg-danger/10 px-4 py-3">
            <span className="text-label">
              Delete {vehicle.name} and its entries? Costs already in Expenses stay there.
            </span>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-9 rounded-full px-3 text-label"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                className="h-9 rounded-full bg-danger px-4 text-label font-semibold text-on-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-2 py-2 text-label font-medium text-danger"
          >
            <Trash2 className="size-4" /> Delete vehicle
          </button>
        ))}
    </form>
  )
}
