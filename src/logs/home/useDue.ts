// Everything the due list needs, read live from the database.

import { useLiveQuery } from 'dexie-react-hooks'

import { listCareTasks } from '../../data/care'
import type { CareTask } from '../../data/db'
import { listThings } from '../../data/things'
import { listVehicleLogs, listVehicles } from '../../data/vehicles'
import { dueItems, type DueItem } from './stats'

async function loadHome() {
  const [things, vehicles, vehicleLogs, careTasks] = await Promise.all([
    listThings(),
    listVehicles(),
    listVehicleLogs(),
    listCareTasks(),
  ])
  return { things, vehicles, vehicleLogs, careTasks }
}

export function useDue(
  today: string,
): { items: DueItem[]; tasks: Map<string, CareTask>; empty: boolean } | undefined {
  const data = useLiveQuery(loadHome)
  if (!data) return undefined
  return {
    items: dueItems(data, today),
    tasks: new Map(data.careTasks.map((t) => [t.id, t])),
    empty: data.things.length + data.vehicles.length + data.careTasks.length === 0,
  }
}
