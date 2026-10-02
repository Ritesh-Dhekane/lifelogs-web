// Add or edit a vehicle entry: fuel (litres, full tank, cost), service (cost) or an odometer
// reading. Costs can go to Expenses too.

import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Sheet } from '../../components/Sheet'
import { Segmented, Toggle } from '../../components/ui'
import type { Vehicle, VehicleLog, VehicleLogKind } from '../../data/db'
import { addVehicleLog, deleteVehicleLog, updateVehicleLog } from '../../data/vehicles'
import { fromLocalInput, toLocalInput } from '../../lib/dates'
import { amountInputValue, currencySymbol, formatMoney, parseAmount } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { VEHICLE_LOG_LABEL } from './labels'

export function VehicleLogSheet({
  open,
  onClose,
  vehicles,
  vehicleId,
  entry,
  startKind = 'fuel',
  lastOdometer,
}: {
  open: boolean
  onClose: () => void
  vehicles: Vehicle[]
  vehicleId: string | null // fixed vehicle, or null to pick one
  entry: VehicleLog | null
  startKind?: VehicleLogKind
  lastOdometer: number | null
}) {
  const title = entry ? `Edit ${VEHICLE_LOG_LABEL[entry.kind].toLowerCase()}` : 'New entry'
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && (
        <LogForm
          key={entry?.id ?? `new-${startKind}`}
          vehicles={vehicles}
          vehicleId={vehicleId}
          entry={entry}
          startKind={startKind}
          lastOdometer={lastOdometer}
          onDone={onClose}
        />
      )}
    </Sheet>
  )
}

function LogForm({
  vehicles,
  vehicleId,
  entry,
  startKind,
  lastOdometer,
  onDone,
}: {
  vehicles: Vehicle[]
  vehicleId: string | null
  entry: VehicleLog | null
  startKind: VehicleLogKind
  lastOdometer: number | null
  onDone: () => void
}) {
  const prefs = usePrefs()
  const { currency } = prefs
  const expensesOn = Boolean(prefs.logs.enabled.expenses)
  const [vehicle, setVehicle] = useState(entry?.vehicleId ?? vehicleId ?? vehicles[0]?.id ?? '')
  const [kind, setKind] = useState<VehicleLogKind>(entry?.kind ?? startKind)
  const [maxWhen] = useState(() => toLocalInput(new Date().toISOString()))
  const [when, setWhen] = useState(() => toLocalInput(entry?.at ?? new Date().toISOString()))
  const [odometer, setOdometer] = useState(
    entry?.odometerKm != null ? String(entry.odometerKm) : '',
  )
  const [litres, setLitres] = useState(entry?.litres != null ? String(entry.litres) : '')
  const [fullTank, setFullTank] = useState(entry?.fullTank ?? true)
  const [cost, setCost] = useState(
    entry?.costMinor ? amountInputValue(entry.costMinor, currency) : '',
  )
  const [toExpenses, setToExpenses] = useState(entry ? Boolean(entry.expenseId) : expensesOn)
  const [note, setNote] = useState(entry?.note ?? '')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lowConfirmed, setLowConfirmed] = useState(false) // a reading below the last one, on purpose

  const number = (text: string) => (text.trim() ? Number(text.replace(',', '.')) : null)
  const costMinor = cost.trim() ? parseAmount(cost, currency) : null
  const litresValue = number(litres)
  const perLitre =
    kind === 'fuel' && costMinor && litresValue && litresValue > 0 ? costMinor / litresValue : null

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!vehicle) return setError('Add a vehicle first.')
    if (cost.trim() && costMinor === null) return setError('Enter a cost more than zero.')
    if (new Date(when).getTime() > Date.now() + 60_000)
      return setError("The date can't be in the future.")
    const odometerKm = number(odometer)
    if (lastOdometer !== null && odometerKm !== null && odometerKm < lastOdometer && !entry) {
      // Allowed (back-dated entries), but worth a second look.
      if (!lowConfirmed) {
        setLowConfirmed(true)
        return setError(
          `The odometer is below the last reading (${lastOdometer} km). Save again if that's right.`,
        )
      }
    }
    const input = {
      vehicleId: vehicle,
      kind,
      at: fromLocalInput(when),
      odometerKm,
      litres: litresValue,
      fullTank,
      costMinor,
      note,
      addToExpenses: toExpenses,
    }
    try {
      if (entry) await updateVehicleLog(entry.id, input)
      else await addVehicleLog(input)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.")
    }
  }

  async function remove() {
    if (!entry) return
    await deleteVehicleLog(entry.id)
    onDone()
  }

  const field =
    'h-12 w-full rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent'
  const unitField =
    'flex items-center gap-2 rounded-xl bg-card-2 px-4 focus-within:ring-2 focus-within:ring-accent'

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      {!entry && (
        <Segmented<VehicleLogKind>
          label="Entry type"
          value={kind}
          onChange={(value) => {
            setKind(value)
            setError('')
          }}
          options={(['fuel', 'service', 'odometer'] as const).map((value) => ({
            value,
            label: VEHICLE_LOG_LABEL[value],
          }))}
        />
      )}

      {!vehicleId && vehicles.length > 1 && (
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">Vehicle</span>
          <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={field}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">Odometer</span>
          <span className={unitField}>
            <input
              inputMode="decimal"
              value={odometer}
              onChange={(e) => {
                setOdometer(e.target.value)
                setLowConfirmed(false)
                setError('')
              }}
              placeholder={lastOdometer !== null ? String(lastOdometer) : 'Reading'}
              data-autofocus={entry ? undefined : true}
              className="h-12 w-full bg-transparent text-body tnum outline-none"
            />
            <span className="text-label text-ink-2">km</span>
          </span>
        </label>
        {kind === 'fuel' && (
          <label className="flex flex-col gap-2">
            <span className="px-1 text-label font-medium text-ink-2">Fuel</span>
            <span className={unitField}>
              <input
                inputMode="decimal"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                placeholder="0"
                className="h-12 w-full bg-transparent text-body tnum outline-none"
              />
              <span className="text-label text-ink-2">L</span>
            </span>
          </label>
        )}
        {kind !== 'odometer' && (
          <label className={`flex flex-col gap-2 ${kind === 'fuel' ? 'col-span-2' : ''}`}>
            <span className="flex justify-between px-1 text-label font-medium text-ink-2">
              Cost
              {perLitre !== null && (
                <span className="font-normal text-ink-2 tnum">
                  {formatMoney(Math.round(perLitre), currency)}/L
                </span>
              )}
            </span>
            <span className={unitField}>
              <span className="text-body text-ink-2">{currencySymbol(currency)}</span>
              <input
                inputMode="decimal"
                value={cost}
                onChange={(e) => {
                  setCost(e.target.value)
                  setError('')
                }}
                placeholder="0"
                className="h-12 w-full bg-transparent text-body tnum outline-none"
              />
            </span>
          </label>
        )}
      </div>

      {kind === 'fuel' && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-card-2 px-4 py-3">
          <span>
            <span className="block text-body">Filled to full</span>
            <span className="text-label text-ink-2">Mileage is measured between full tanks</span>
          </span>
          <Toggle label="Filled to full" checked={fullTank} onChange={setFullTank} />
        </div>
      )}

      {kind !== 'odometer' && expensesOn && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-card-2 px-4 py-3">
          <span>
            <span className="block text-body">Add to Expenses</span>
            <span className="text-label text-ink-2">
              As {kind === 'fuel' ? 'Fuel' : 'Vehicle'}; kept in step with this entry
            </span>
          </span>
          <Toggle label="Add to Expenses" checked={toExpenses} onChange={setToExpenses} />
        </div>
      )}

      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">Date & time</span>
        <input
          type="datetime-local"
          value={when}
          max={maxWhen}
          onChange={(e) => setWhen(e.target.value)}
          className={field}
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex justify-between px-1 text-label font-medium text-ink-2">
          Note <span className="font-normal text-ink-3">Optional</span>
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder={kind === 'service' ? 'e.g. Oil change, brake pads' : 'e.g. HP, Andheri'}
          className={field}
        />
      </label>

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

      {entry &&
        (confirmDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
            <span className="text-label">
              Delete this entry{entry.expenseId ? ' and its expense' : ''}?
            </span>
            <div className="flex gap-2">
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
            <Trash2 className="size-4" /> Delete entry
          </button>
        ))}
    </form>
  )
}
