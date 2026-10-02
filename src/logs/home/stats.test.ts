import { describe, expect, it } from 'vitest'

import type { CareTask, Thing, Vehicle, VehicleLog } from '../../data/db'
import { careNextDue, dueItems, mileage, serviceStatus } from './stats'

const fuel = (
  at: string,
  odometerKm: number,
  litres: number,
  costMinor: number,
  fullTank = true,
): VehicleLog => ({
  id: at,
  vehicleId: 'car',
  kind: 'fuel',
  at,
  odometerKm,
  litres,
  fullTank,
  costMinor,
  note: null,
  expenseId: null,
  createdAt: at,
  updatedAt: at,
  deletedAt: null,
})

const service = (at: string, odometerKm: number): VehicleLog => ({
  ...fuel(at, odometerKm, 0, 0),
  kind: 'service',
  litres: null,
  fullTank: false,
  costMinor: 450000,
})

const car: Vehicle = {
  id: 'car',
  name: 'Swift',
  type: 'car',
  serviceEveryKm: 10000,
  serviceEveryMonths: 12,
  archived: false,
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
}

describe('mileage', () => {
  it('measures between full tanks, counting partial fills in between', () => {
    const logs = [
      fuel('2026-09-01T10:00:00Z', 10000, 30, 300000), // first full tank: start of measuring
      fuel('2026-09-08T10:00:00Z', 10250, 10, 100000, false), // partial
      fuel('2026-09-15T10:00:00Z', 10600, 30, 300000), // full: 600 km on 40 L
      fuel('2026-09-25T10:00:00Z', 11000, 20, 200000), // full: 400 km on 20 L
    ]
    const m = mileage(logs)
    expect(m.lastKmPerL).toBe(20)
    expect(m.averageKmPerL).toBeCloseTo(1000 / 60)
    expect(m.distanceKm).toBe(1000)
    expect(m.fuelCostMinor).toBe(900000)
    expect(m.costPerKmMinor).toBe(600) // ₹6/km: ₹6,000 over 1,000 km
  })

  it('has no figure until there are two full tanks', () => {
    expect(mileage([fuel('2026-09-01T10:00:00Z', 10000, 30, 300000)]).averageKmPerL).toBeNull()
  })
})

describe('service', () => {
  it('is due by months or by distance, whichever comes first', () => {
    const logs = [
      service('2026-01-10T10:00:00Z', 20000),
      fuel('2026-09-30T10:00:00Z', 29700, 30, 1),
    ]
    const status = serviceStatus(car, logs, '2026-10-02')
    expect(status.dueOn).toBe('2027-01-10')
    expect(status.dueAtKm).toBe(30000)
    expect(status.kmLeft).toBe(300)
    expect(status.state).toBe('soon')
    expect(serviceStatus(car, logs, '2027-01-11').state).toBe('overdue')
  })

  it('is unknown until a service has been logged', () => {
    expect(serviceStatus(car, [], '2026-10-02').state).toBe('unknown')
  })
})

describe('due list', () => {
  const thing = (patch: Partial<Thing>): Thing => ({
    id: patch.name ?? 'x',
    kind: 'document',
    name: 'x',
    category: 'other',
    place: null,
    boughtOn: null,
    priceMinor: null,
    expiresOn: null,
    remindDays: 30,
    note: null,
    photoId: null,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...patch,
  })
  const task = (patch: Partial<CareTask>): CareTask => ({
    id: patch.name ?? 't',
    name: 't',
    group: 'plant',
    everyDays: 3,
    startOn: '2026-10-02',
    lastDoneAt: null,
    note: null,
    archived: false,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...patch,
  })

  it('counts care from the last time it was done', () => {
    expect(careNextDue(task({ lastDoneAt: new Date(2026, 9, 1, 18).toISOString() }))).toBe(
      '2026-10-04',
    )
    expect(careNextDue(task({ startOn: '2026-10-05' }))).toBe('2026-10-05')
  })

  it('brings documents, warranties, service and care together by date', () => {
    const items = dueItems(
      {
        things: [
          thing({ name: 'Passport', expiresOn: '2027-03-01', remindDays: 180 }),
          thing({ name: 'Car insurance', expiresOn: '2026-09-28' }), // expired
          thing({ name: 'Licence', expiresOn: '2027-06-01' }), // outside its window
          thing({ name: 'TV', kind: 'item', expiresOn: '2026-10-20' }), // warranty ending
          thing({ name: 'Old phone', kind: 'item', expiresOn: '2026-09-01' }), // warranty over
        ],
        vehicles: [car],
        vehicleLogs: [
          service('2026-01-10T10:00:00Z', 20000),
          fuel('2026-09-30T10:00:00Z', 29700, 30, 1),
        ],
        careTasks: [
          task({ name: 'Water monstera', lastDoneAt: new Date(2026, 8, 27, 9).toISOString() }),
          task({ name: 'Deworm Bruno', everyDays: 90, startOn: '2026-12-20' }), // beyond 30 days
        ],
      },
      '2026-10-02',
    )
    expect(items.map((i) => [i.title, i.source, i.overdue])).toEqual([
      ['Car insurance', 'document', true],
      ['Water monstera', 'care', true],
      ['Swift service', 'service', false],
      ['TV', 'warranty', false],
      ['Passport', 'document', false],
    ])
  })
})
