// Rest timer state: when the current rest ends (ms), kept in localStorage to survive reloads.

import { useSyncExternalStore } from 'react'

const KEY = 'lifelogs-rest-until'
const listeners = new Set<() => void>()

function read(): number | null {
  try {
    const value = Number(localStorage.getItem(KEY))
    return value > 0 ? value : null
  } catch {
    return null
  }
}

function write(until: number | null) {
  try {
    if (until) localStorage.setItem(KEY, String(until))
    else localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener())
}

export function startRest(seconds: number) {
  write(Date.now() + seconds * 1000)
}

export function stopRest() {
  write(null)
}

export function useRestUntil(): number | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => null,
  )
}

export function addRest(seconds: number) {
  const until = read()
  if (until) write(until + seconds * 1000)
}
