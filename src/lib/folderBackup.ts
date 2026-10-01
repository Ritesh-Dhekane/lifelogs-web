// "Save to a folder" (desktop Chrome/Edge): the user picks a folder once; after that a backup file
// (data + photos) is written there whenever data changes, one file per day, keeping the last week.
// Hidden where the File System Access API is missing (phones, Firefox, Safari).

import Dexie, { type ObservabilitySet, type Table } from 'dexie'
import { useSyncExternalStore } from 'react'

import { backupFileName, createBackup } from '../data/backup'
import { db } from '../data/db'
import { recordBackup } from './backupStatus'

// Not in TypeScript's DOM types yet.
type Permission = 'granted' | 'denied' | 'prompt'
interface DirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission(options: { mode: 'readwrite' }): Promise<Permission>
  requestPermission(options: { mode: 'readwrite' }): Promise<Permission>
}
type PickerWindow = Window & {
  showDirectoryPicker?: (options: { id?: string; mode?: 'readwrite' }) => Promise<DirectoryHandle>
}

const KEEP_FILES = 7
const WRITE_DELAY_MS = 5000
const FILE_PATTERN = /^lifelogs-backup-\d{4}-\d{2}-\d{2}\.json$/

export const folderBackupSupported =
  typeof window !== 'undefined' &&
  typeof (window as PickerWindow).showDirectoryPicker === 'function' &&
  !/Android|iPhone|iPad/i.test(navigator.userAgent)

// The folder handle can't go in localStorage, so it lives in a small database of its own (kept
// out of the main one so backups and resets don't touch it).
class LocalDB extends Dexie {
  kv!: Table<{ key: string; value: unknown }, string>
  constructor() {
    super('lifelogs-local')
    this.version(1).stores({ kv: 'key' })
  }
}
const local = new LocalDB()

export interface FolderState {
  folder: string | null // folder name
  permission: Permission | null
  lastWrite: string | null // ISO time
  error: string | null
}

let handle: DirectoryHandle | null = null
let state: FolderState = { folder: null, permission: null, lastWrite: null, error: null }
const listeners = new Set<() => void>()

function update(patch: Partial<FolderState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function useFolderBackup(): FolderState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
}

// Load the saved folder and, if the browser still allows writing, bring the copy up to date and
// keep it current.
export async function startFolderBackup(): Promise<void> {
  if (!folderBackupSupported || handle) return
  const saved = (await local.kv.get('folder'))?.value as DirectoryHandle | undefined
  const lastWrite = ((await local.kv.get('folderLastWrite'))?.value as string | undefined) ?? null
  if (!saved) return
  handle = saved
  update({
    folder: saved.name,
    lastWrite,
    permission: await saved.queryPermission({ mode: 'readwrite' }),
  })
  Dexie.on('storagemutated', scheduleWrite)
  if (state.permission === 'granted') scheduleWrite()
}

export async function chooseFolder(): Promise<void> {
  const picker = (window as PickerWindow).showDirectoryPicker
  if (!picker) return
  let picked: DirectoryHandle
  try {
    picked = await picker({ id: 'lifelogs-backup', mode: 'readwrite' })
  } catch {
    return // cancelled
  }
  const firstTime = !handle
  handle = picked
  await local.kv.put({ key: 'folder', value: picked })
  update({ folder: picked.name, permission: 'granted', error: null })
  if (firstTime) Dexie.on('storagemutated', scheduleWrite)
  await writeNow()
}

// After a browser restart Chrome may ask again; this must run from a click.
export async function allowFolder(): Promise<void> {
  if (!handle) return
  const permission = await handle.requestPermission({ mode: 'readwrite' })
  update({ permission })
  if (permission === 'granted') await writeNow()
}

export async function forgetFolder(): Promise<void> {
  Dexie.on('storagemutated').unsubscribe(scheduleWrite)
  handle = null
  await local.kv.bulkDelete(['folder', 'folderLastWrite'])
  update({ folder: null, permission: null, lastWrite: null, error: null })
}

let timer: ReturnType<typeof setTimeout> | undefined
// Fires for writes to any Dexie database; only changes to the app's own data count.
function scheduleWrite(parts?: ObservabilitySet) {
  if (parts && !Object.keys(parts).some((key) => key.startsWith(`idb://${db.name}/`))) return
  clearTimeout(timer)
  timer = setTimeout(() => void writeNow(), WRITE_DELAY_MS)
}

export async function writeNow(): Promise<void> {
  clearTimeout(timer)
  if (!handle) return
  const permission = await handle.queryPermission({ mode: 'readwrite' })
  if (permission !== 'granted') {
    update({ permission })
    return
  }
  try {
    const backup = await createBackup()
    const file = await handle.getFileHandle(backupFileName(), { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(backup))
    await writable.close()
    await pruneOldFiles(handle)
    await local.kv.put({ key: 'folderLastWrite', value: backup.exportedAt })
    recordBackup('folder', backup.exportedAt)
    update({ lastWrite: backup.exportedAt, permission, error: null })
  } catch {
    update({ error: "Couldn't write to the folder. Check it still exists, or choose it again." })
  }
}

async function pruneOldFiles(folder: DirectoryHandle) {
  const names: string[] = []
  for await (const entry of folder.values()) {
    if (entry.kind === 'file' && FILE_PATTERN.test(entry.name)) names.push(entry.name)
  }
  // Dated names sort by date; drop all but the newest few.
  for (const name of names.sort().slice(0, -KEEP_FILES)) await folder.removeEntry(name)
}
