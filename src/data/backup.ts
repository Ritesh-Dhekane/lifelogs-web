// Backup = one JSON document with every table and the preferences. The same document is used
// for "Export to a file" and for Google Drive. Restoring replaces everything on this device.

import { getPrefs, normalizePrefs, setPrefs, type Prefs } from '../lib/prefs'
import { db } from './db'

export const BACKUP_APP = 'lifelogs'
// v1: Lift tables. v2: + progress photos (image bytes as base64). v3: + expenses.
export const BACKUP_VERSION = 3

const TABLES = [
  'weights',
  'exercises',
  'workouts',
  'workoutExercises',
  'sets',
  'profile',
  'photos',
  'expenses',
  'expenseCategories',
  'recurring',
] as const
type TableName = (typeof TABLES)[number]

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  prefs: Prefs
  tables: Record<TableName, unknown[]>
}

export class BackupError extends Error {}

export async function createBackup(): Promise<Backup> {
  const tables = {} as Record<TableName, unknown[]>
  await db.transaction(
    'r',
    TABLES.map((name) => db.table(name)),
    async () => {
      for (const name of TABLES) tables[name] = await db.table(name).toArray()
      tables.photos = (tables.photos as Record<string, unknown>[]).map(encodePhoto)
    },
  )
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    prefs: getPrefs(),
    tables,
  }
}

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError("This file isn't a LifeLogs backup (it isn't valid JSON).")
  }
  const backup = data as Partial<Backup>
  if (backup?.app !== BACKUP_APP || typeof backup.version !== 'number' || !backup.tables) {
    throw new BackupError("This file isn't a LifeLogs backup.")
  }
  if (backup.version > BACKUP_VERSION) {
    throw new BackupError(
      'This backup was made by a newer version of LifeLogs. Update the app first.',
    )
  }
  for (const name of TABLES) {
    const rows = backup.tables[name]
    if (rows !== undefined && !Array.isArray(rows))
      throw new BackupError(`The backup's ${name} data is damaged.`)
    if (
      rows?.some(
        (row) =>
          !row || typeof row !== 'object' || typeof (row as { id?: unknown }).id !== 'string',
      )
    ) {
      throw new BackupError(`The backup's ${name} data is damaged.`)
    }
  }
  return backup as Backup
}

// Replace everything on this device with the backup (all or nothing).
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction(
    'rw',
    TABLES.map((name) => db.table(name)),
    async () => {
      for (const name of TABLES) {
        // Older backups have no category table: keep the built-in categories then.
        if (name === 'expenseCategories' && !backup.tables[name]) continue
        await db.table(name).clear()
        const rows =
          name === 'photos'
            ? (backup.tables.photos ?? []).map((row) => decodePhoto(row as Record<string, unknown>))
            : (backup.tables[name] ?? [])
        if (rows.length) await db.table(name).bulkPut(rows)
      }
    },
  )
  setPrefs(() => normalizePrefs(backup.prefs))
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `lifelogs-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

export async function countEntries(): Promise<number> {
  const [weights, workouts, expenses] = await Promise.all([
    db.weights.toArray(),
    db.workouts.toArray(),
    db.expenses.toArray(),
  ])
  return (
    weights.filter((w) => !w.deletedAt).length +
    workouts.filter((w) => !w.deletedAt && w.endedAt).length +
    expenses.filter((e) => !e.deletedAt).length
  )
}

// Wipe every log on this device (Settings → Reset). Built-in exercises come back on next open.
export async function resetAllData(): Promise<void> {
  await db.delete()
  try {
    localStorage.clear()
  } catch {
    // ignore
  }
}

// ---------- Image bytes <-> base64 ----------

function encodePhoto(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    data: toBase64(row.data as ArrayBuffer),
    thumb: toBase64(row.thumb as ArrayBuffer),
  }
}

function decodePhoto(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    data: fromBase64(String(row.data ?? '')),
    thumb: fromBase64(String(row.thumb ?? '')),
  }
}

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export function fromBase64(text: string): ArrayBuffer {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
