import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { addCareTask, deleteCareLog, listCareTasks, markCareDone } from './care'
import { db } from './db'
import { listExpenses } from './expenses'
import { addThing, deleteThing, getThing, listThings, setThingPhoto } from './things'
import {
  addVehicle,
  addVehicleLog,
  deleteVehicleLog,
  listVehicleLogs,
  updateVehicleLog,
} from './vehicles'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const image = (n: number) => ({
  data: new Uint8Array(n).buffer,
  mime: 'image/jpeg',
  width: 10,
  height: 10,
})

describe('things', () => {
  it('validates, replaces the photo and drops its bytes on delete', async () => {
    await expect(addThing({ kind: 'item', name: '  ', category: 'other' })).rejects.toThrow()
    const tv = await addThing({
      kind: 'item',
      name: 'TV',
      category: 'electronics',
      boughtOn: '2025-10-20',
      expiresOn: '2026-10-20',
      priceMinor: 4500000,
    })
    await setThingPhoto(tv.id, { image: image(100), thumb: image(10) })
    await setThingPhoto(tv.id, { image: image(200), thumb: image(20) })
    expect(await db.attachments.count()).toBe(1)
    expect((await db.attachments.get((await getThing(tv.id))!.photoId!))!.data.byteLength).toBe(200)

    await deleteThing(tv.id)
    expect(await listThings()).toEqual([])
    expect(await db.attachments.count()).toBe(0)
  })
})

describe('vehicles', () => {
  it('keeps the linked expense in step with the fuel entry', async () => {
    const car = await addVehicle({ name: 'Swift', type: 'car', serviceEveryKm: 10000 })
    const log = await addVehicleLog({
      vehicleId: car.id,
      kind: 'fuel',
      at: '2026-10-01T10:00:00Z',
      odometerKm: 12000,
      litres: 30,
      costMinor: 315000,
      addToExpenses: true,
    })
    let [expense] = await listExpenses()
    expect(expense).toMatchObject({
      amountMinor: 315000,
      categoryId: 'cat-fuel',
      note: 'Swift fuel · 30 L',
    })

    await updateVehicleLog(log.id, {
      vehicleId: car.id,
      kind: 'fuel',
      at: '2026-10-01T10:00:00Z',
      odometerKm: 12000,
      litres: 32,
      costMinor: 336000,
      addToExpenses: true,
    })
    ;[expense] = await listExpenses()
    expect(expense!.amountMinor).toBe(336000)

    await deleteVehicleLog(log.id)
    expect(await listExpenses()).toEqual([])
    expect(await listVehicleLogs(car.id)).toEqual([])
  })

  it('needs an odometer reading for odometer entries', async () => {
    const car = await addVehicle({ name: 'Activa', type: 'scooter' })
    await expect(
      addVehicleLog({ vehicleId: car.id, kind: 'odometer', at: '2026-10-01T10:00:00Z' }),
    ).rejects.toThrow()
  })
})

describe('care', () => {
  it('marks done and undoes it', async () => {
    const task = await addCareTask({
      name: 'Water monstera',
      group: 'plant',
      everyDays: 3,
      startOn: '2026-10-02',
    })
    const first = await markCareDone(task.id, '2026-10-02T08:00:00Z')
    const second = await markCareDone(task.id, '2026-10-05T08:00:00Z')
    expect((await listCareTasks())[0]!.lastDoneAt).toBe('2026-10-05T08:00:00Z')
    await deleteCareLog(second.id)
    expect((await listCareTasks())[0]!.lastDoneAt).toBe('2026-10-02T08:00:00Z')
    await deleteCareLog(first.id)
    expect((await listCareTasks())[0]!.lastDoneAt).toBeNull()
  })
})
