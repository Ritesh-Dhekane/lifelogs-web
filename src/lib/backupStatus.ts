// When data was last backed up (file export or Google Drive), for the status chips.

import { useSyncExternalStore } from 'react'

const KEY = 'lifelogs-last-backup'
const listeners = new Set<() => void>()

export interface BackupStatus {
  at: string // ISO time
  where: 'file' | 'drive'
}

function read(): BackupStatus | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as BackupStatus | null
  } catch {
    return null
  }
}

let current = read()

export function recordBackup(where: BackupStatus['where'], at: string = new Date().toISOString()) {
  current = { at, where }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener())
}

export function useBackupStatus(): BackupStatus | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
    () => null,
  )
}

// "Backed up 2 h ago", "Backed up yesterday", "Not backed up yet".
export function describeBackup(status: BackupStatus | null, now: number = Date.now()): string {
  if (!status) return 'Not backed up yet'
  const minutes = Math.round((now - new Date(status.at).getTime()) / 60000)
  if (minutes < 1) return 'Backed up just now'
  if (minutes < 60) return `Backed up ${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Backed up ${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Backed up yesterday' : `Backed up ${days} days ago`
}
