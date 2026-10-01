// "Install app": Chrome/Edge/Android fire beforeinstallprompt, which is kept so a button can show
// the browser's install dialog later. iPhone/iPad Safari has no such event, so there we explain
// Share › Add to Home Screen instead.

import { useSyncExternalStore } from 'react'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState =
  | { kind: 'installed' } // running as the installed app
  | { kind: 'prompt' } // the browser can install it from a button
  | { kind: 'ios' } // Safari on iPhone/iPad: manual steps
  | { kind: 'none' } // not offered here (e.g. Firefox desktop)

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

function standalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function compute(): InstallState {
  if (standalone()) return { kind: 'installed' }
  if (deferred) return { kind: 'prompt' }
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return { kind: 'ios' }
  return { kind: 'none' }
}

let state: InstallState = { kind: 'none' }

function refresh() {
  state = compute()
  listeners.forEach((listener) => listener())
}

export function listenForInstall() {
  state = compute()
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // no mini-infobar; we offer it in Settings
    deferred = event as InstallPromptEvent
    refresh()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    refresh()
  })
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return
  const event = deferred
  await event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') deferred = null
  refresh()
}

export function useInstall(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
}
