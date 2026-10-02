// Care tasks: repeat jobs for plants, pets and the home ("Water the monstera every 3 days").
// The next due date counts from the last time it was done.

import { db, newId, nowIso, type CareGroup, type CareLog, type CareTask } from './db'

export interface CareInput {
  name: string
  group: CareGroup
  everyDays: number
  startOn: string
  note?: string | null
}

function normalize(input: CareInput) {
  const name = input.name.trim().slice(0, 60)
  if (!name) throw new Error('Give it a name')
  const everyDays = Math.round(input.everyDays)
  if (!Number.isFinite(everyDays) || everyDays < 1 || everyDays > 730) {
    throw new Error('Repeat every 1 to 730 days')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startOn)) throw new Error('Pick a start date')
  return {
    name,
    group: input.group,
    everyDays,
    startOn: input.startOn,
    note: input.note?.trim().slice(0, 300) || null,
  }
}

export async function listCareTasks(): Promise<CareTask[]> {
  const rows = await db.careTasks.toArray()
  return rows.filter((row) => !row.deletedAt).sort((a, b) => a.name.localeCompare(b.name))
}

export async function addCareTask(input: CareInput): Promise<CareTask> {
  const now = nowIso()
  const task: CareTask = {
    id: newId(),
    ...normalize(input),
    lastDoneAt: null,
    archived: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.careTasks.add(task)
  return task
}

export async function updateCareTask(id: string, input: CareInput): Promise<void> {
  await db.careTasks.update(id, { ...normalize(input), updatedAt: nowIso() })
}

export async function deleteCareTask(id: string): Promise<void> {
  await db.careTasks.update(id, { deletedAt: nowIso(), updatedAt: nowIso() })
}

export async function listCareLogs(taskId?: string): Promise<CareLog[]> {
  const rows = taskId
    ? await db.careLogs.where('taskId').equals(taskId).toArray()
    : await db.careLogs.toArray()
  return rows.sort((a, b) => b.doneAt.localeCompare(a.doneAt))
}

async function refreshLastDone(taskId: string) {
  const [latest] = await listCareLogs(taskId)
  await db.careTasks.update(taskId, { lastDoneAt: latest?.doneAt ?? null, updatedAt: nowIso() })
}

export async function markCareDone(
  taskId: string,
  doneAt: string = nowIso(),
  note: string | null = null,
): Promise<CareLog> {
  const log: CareLog = {
    id: newId(),
    taskId,
    doneAt,
    note: note?.trim().slice(0, 300) || null,
    createdAt: nowIso(),
  }
  await db.transaction('rw', db.careLogs, db.careTasks, async () => {
    await db.careLogs.add(log)
    await refreshLastDone(taskId)
  })
  return log
}

// Undo a "done" (e.g. tapped by mistake); the due date goes back to the previous one.
export async function deleteCareLog(id: string): Promise<void> {
  await db.transaction('rw', db.careLogs, db.careTasks, async () => {
    const log = await db.careLogs.get(id)
    if (!log) return
    await db.careLogs.delete(id)
    await refreshLastDone(log.taskId)
  })
}
