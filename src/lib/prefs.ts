// User preferences (theme, units, logs on/off…). Small, so they live in localStorage and are
// read synchronously at startup; the backup file includes them too. Changed only in Settings.

import { useSyncExternalStore } from 'react'

import { isCurrency, type CurrencyCode } from './currencies'

export type ThemeMode = 'light' | 'dark' | 'system'
export type WeightUnit = 'kg' | 'lb'
export type WeekStart = 'monday' | 'sunday'

export interface Prefs {
  theme: { mode: ThemeMode; oled: boolean }
  units: { weight: WeightUnit }
  currency: CurrencyCode
  weekStart: WeekStart
  restSeconds: number
  logs: { order: string[]; enabled: Record<string, boolean> }
}

export const PREFS_KEY = 'lifelogs-prefs'

export const DEFAULT_PREFS: Prefs = {
  theme: { mode: 'system', oled: false },
  units: { weight: 'kg' },
  currency: 'INR',
  weekStart: 'monday',
  restSeconds: 90,
  logs: { order: [], enabled: { lift: true, expenses: true, home: true } },
}

// Fill in anything missing (older saves, hand-edited storage) from the defaults.
export function normalizePrefs(value: unknown): Prefs {
  const saved = (value && typeof value === 'object' ? value : {}) as Partial<Prefs>
  return {
    theme: { ...DEFAULT_PREFS.theme, ...saved.theme },
    units: { ...DEFAULT_PREFS.units, ...saved.units },
    currency: isCurrency(saved.currency) ? saved.currency : DEFAULT_PREFS.currency,
    weekStart: saved.weekStart === 'sunday' ? 'sunday' : 'monday',
    restSeconds:
      typeof saved.restSeconds === 'number' && saved.restSeconds > 0
        ? saved.restSeconds
        : DEFAULT_PREFS.restSeconds,
    logs: {
      order: Array.isArray(saved.logs?.order) ? saved.logs.order : [],
      enabled: { ...DEFAULT_PREFS.logs.enabled, ...saved.logs?.enabled },
    },
  }
}

function load(): Prefs {
  try {
    return normalizePrefs(JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null'))
  } catch {
    return normalizePrefs(null)
  }
}

let current = load()
const listeners = new Set<() => void>()

export function getPrefs(): Prefs {
  return current
}

export function setPrefs(update: (prefs: Prefs) => Prefs) {
  current = normalizePrefs(update(current))
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(current))
  } catch {
    // Storage blocked: the change still applies for this session.
  }
  applyTheme(current)
  listeners.forEach((listener) => listener())
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getPrefs,
    getPrefs,
  )
}

// ---------- Theme ----------

const darkQuery =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function isDark(prefs: Prefs): boolean {
  return (
    prefs.theme.mode === 'dark' || (prefs.theme.mode === 'system' && Boolean(darkQuery?.matches))
  )
}

export function applyTheme(prefs: Prefs) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const dark = isDark(prefs)
  root.classList.toggle('dark', dark)
  root.classList.toggle('oled', dark && prefs.theme.oled)
  const color = dark ? '#000000' : '#f5f5f7'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}

// Follow the system theme live when the user chose "System".
darkQuery?.addEventListener('change', () => applyTheme(current))
