// Vehicles and their fuel, service and odometer entries. A cost can also be added to Expenses;
// the two stay linked, so editing or deleting the entry updates or deletes the expense too.

import {
  db,
  newId,
  nowIso,
  type Vehicle,
  type VehicleLog,
  type VehicleLogKind,
  type VehicleType,
} from './db'

export interface VehicleInput {
  name: string
  type: VehicleType
  serviceEveryKm?: number | null
  serviceEveryMonths?: number | null
}

function positiveOrNull(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

function normalizeVehicle(input: VehicleInput) {
  const name = input.name.trim().slice(0, 60)
  if (!name) throw new Error('Give the vehicle a name')
  return {
    name,
    type: input.type,
    serviceEveryKm: positiveOrNull(input.serviceEveryKm),
    serviceEveryMonths: positiveOrNull(input.serviceEveryMonths),
  }
}

export async function listVehicles(): Promise<Vehicle[]> {
  const rows = await db.vehicles.toArray()
  return rows.filter((row) => !row.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getVehicle(id: string): Promise<Vehicle | undefined> {
  const row = await db.vehicles.get(id)
  return row && !row.deletedAt ? row : undefined
}

export async function addVehicle(input: VehicleInput): Promise<Vehicle> {
  const now = nowIso()
  const vehicle: Vehicle = {
    id: newId(),
    ...normalizeVehicle(input),
    archived: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.vehicles.add(vehicle)
  return vehicle
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<void> {
  await db.vehicles.update(id, { ...normalizeVehicle(input), updatedAt: nowIso() })
}

// Deleting a vehicle deletes its entries; expenses already added stay in Expenses.
export async function deleteVehicle(id: string): Promise<void> {
  const now = nowIso()
  await db.transaction('rw', db.vehicles, db.vehicleLogs, async () => {
    await db.vehicles.update(id, { deletedAt: now, updatedAt: now })
    await db.vehicleLogs.where('vehicleId').equals(id).modify({ deletedAt: now, updatedAt: now })
  })
}

// ---------- Entries ----------

export interface VehicleLogInput {
  vehicleId: string
  kind: VehicleLogKind
  at: string
  odometerKm?: number | null
  litres?: number | null
  fullTank?: boolean
  costMinor?: number | null
  note?: string | null
  addToExpenses?: boolean
}

function normalizeLog(input: VehicleLogInput) {
  const odometerKm = input.odometerKm ?? null
  if (odometerKm !== null && (!Number.isFinite(odometerKm) || odometerKm < 0)) {
    throw new Error('Odometer must be zero or more')
  }
  if (input.kind === 'odometer' && odometerKm === null)
    throw new Error('Enter the odometer reading')
  const litres = input.kind === 'fuel' ? (input.litres ?? null) : null
  if (litres !== null && (!Number.isFinite(litres) || litres <= 0)) {
    throw new Error('Litres must be more than zero')
  }
  const costMinor = input.kind === 'odometer' ? null : (input.costMinor ?? null)
  if (costMinor !== null && (!Number.isInteger(costMinor) || costMinor <= 0)) {
    throw new Error('Cost must be more than zero')
  }
  return {
    vehicleId: input.vehicleId,
    kind: input.kind,
    at: input.at,
    odometerKm: odometerKm === null ? null : Math.round(odometerKm * 10) / 10,
    litres: litres === null ? null : Math.round(litres * 100) / 100,
    fullTank: input.kind === 'fuel' ? (input.fullTank ?? true) : false,
    costMinor,
    note: input.note?.trim().slice(0, 300) || null,
  }
}

export async function listVehicleLogs(vehicleId?: string): Promise<VehicleLog[]> {
  const rows = vehicleId
    ? await db.vehicleLogs.where('vehicleId').equals(vehicleId).toArray()
    : await db.vehicleLogs.toArray()
  return rows.filter((row) => !row.deletedAt).sort((a, b) => b.at.localeCompare(a.at))
}

const CATEGORY_FOR: Record<VehicleLogKind, string> = {
  fuel: 'cat-fuel',
  service: 'cat-vehicle',
  odometer: 'cat-vehicle',
}

async function vehicleName(id: string): Promise<string> {
  return (await db.vehicles.get(id))?.name ?? 'Vehicle'
}

function expenseNote(kind: VehicleLogKind, name: string, litres: number | null): string {
  if (kind === 'fuel') return `${name} fuel${litres ? ` · ${litres} L` : ''}`
  return `${name} service`
}

export async function addVehicleLog(input: VehicleLogInput): Promise<VehicleLog> {
  const fields = normalizeLog(input)
  const now = nowIso()
  const id = newId()
  let expenseId: string | null = null
  await db.transaction('rw', db.vehicleLogs, db.expenses, db.vehicles, async () => {
    if (input.addToExpenses && fields.costMinor) {
      expenseId = newId()
      await db.expenses.add({
        id: expenseId,
        spentAt: fields.at,
        amountMinor: fields.costMinor,
        categoryId: CATEGORY_FOR[fields.kind],
        paidWith: null,
        note: expenseNote(fields.kind, await vehicleName(fields.vehicleId), fields.litres),
        recurringId: null,
        linkedTo: `vehicleLog:${id}`,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
    }
    await db.vehicleLogs.add({
      id,
      ...fields,
      expenseId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  })
  return (await db.vehicleLogs.get(id))!
}

export async function updateVehicleLog(id: string, input: VehicleLogInput): Promise<void> {
  const fields = normalizeLog(input)
  const now = nowIso()
  await db.transaction('rw', db.vehicleLogs, db.expenses, db.vehicles, async () => {
    const current = await db.vehicleLogs.get(id)
    if (!current) return
    let expenseId = current.expenseId
    const linked = expenseId ? await db.expenses.get(expenseId) : undefined
    const wantExpense = Boolean(input.addToExpenses && fields.costMinor)
    if (linked && !linked.deletedAt && wantExpense) {
      await db.expenses.update(linked.id, {
        spentAt: fields.at,
        amountMinor: fields.costMinor!,
        categoryId: CATEGORY_FOR[fields.kind],
        note: expenseNote(fields.kind, await vehicleName(fields.vehicleId), fields.litres),
        updatedAt: now,
      })
    } else if (linked && !linked.deletedAt && !wantExpense) {
      await db.expenses.update(linked.id, { deletedAt: now, updatedAt: now })
      expenseId = null
    } else if (wantExpense) {
      expenseId = newId()
      await db.expenses.add({
        id: expenseId,
        spentAt: fields.at,
        amountMinor: fields.costMinor!,
        categoryId: CATEGORY_FOR[fields.kind],
        paidWith: null,
        note: expenseNote(fields.kind, await vehicleName(fields.vehicleId), fields.litres),
        recurringId: null,
        linkedTo: `vehicleLog:${id}`,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
    }
    await db.vehicleLogs.update(id, { ...fields, expenseId, updatedAt: now })
  })
}

export async function deleteVehicleLog(id: string): Promise<void> {
  const now = nowIso()
  await db.transaction('rw', db.vehicleLogs, db.expenses, async () => {
    const current = await db.vehicleLogs.get(id)
    if (!current) return
    if (current.expenseId) {
      await db.expenses.update(current.expenseId, { deletedAt: now, updatedAt: now })
    }
    await db.vehicleLogs.update(id, { deletedAt: now, updatedAt: now })
  })
}
