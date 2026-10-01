// Settings: the only place where theme and units change.

import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Lock, Moon, Smartphone, Sun } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { Card, SectionLabel, Segmented, Toggle } from '../components/ui'
import { countEntries, resetAllData } from '../data/backup'
import { storageEstimate } from '../data/db'
import { describeBackup, useBackupStatus } from '../lib/backupStatus'
import {
  isDark,
  setPrefs,
  usePrefs,
  type ThemeMode,
  type WeightUnit,
  type WeekStart,
} from '../lib/prefs'

export function SettingsPage() {
  const prefs = usePrefs()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      <SectionLabel>Appearance</SectionLabel>
      <Card className="flex flex-col gap-4">
        <Segmented<ThemeMode>
          label="Theme"
          value={prefs.theme.mode}
          onChange={(mode) => setPrefs((p) => ({ ...p, theme: { ...p.theme, mode } }))}
          options={[
            {
              value: 'light',
              label: (
                <>
                  <Sun className="size-4" /> Light
                </>
              ),
            },
            {
              value: 'dark',
              label: (
                <>
                  <Moon className="size-4" /> Dark
                </>
              ),
            },
            {
              value: 'system',
              label: (
                <>
                  <Smartphone className="size-4" /> System
                </>
              ),
            },
          ]}
        />
        <Row
          title="Pure black"
          text="True black backgrounds in dark mode — easier on OLED screens."
          control={
            <Toggle
              label="Pure black"
              checked={prefs.theme.oled}
              disabled={!isDark(prefs)}
              onChange={(oled) => setPrefs((p) => ({ ...p, theme: { ...p.theme, oled } }))}
            />
          }
        />
      </Card>

      <SectionLabel>Units & formatting</SectionLabel>
      <Card className="flex flex-col divide-y divide-line py-1">
        <Row
          title="Weight"
          control={
            <div className="w-32">
              <Segmented<WeightUnit>
                size="sm"
                label="Weight unit"
                value={prefs.units.weight}
                onChange={(weight) => setPrefs((p) => ({ ...p, units: { ...p.units, weight } }))}
                options={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                ]}
              />
            </div>
          }
        />
        <Row
          title="First day of week"
          control={
            <div className="w-44">
              <Segmented<WeekStart>
                size="sm"
                label="First day of week"
                value={prefs.weekStart}
                onChange={(weekStart) => setPrefs((p) => ({ ...p, weekStart }))}
                options={[
                  { value: 'monday', label: 'Monday' },
                  { value: 'sunday', label: 'Sunday' },
                ]}
              />
            </div>
          }
        />
      </Card>

      <SectionLabel>Workouts</SectionLabel>
      <Card className="py-1">
        <Row
          title="Rest timer"
          text="Starts when you tick off a set"
          control={
            <div className="w-56">
              <Segmented<string>
                size="sm"
                label="Rest timer length"
                value={String(prefs.restSeconds)}
                onChange={(value) => setPrefs((p) => ({ ...p, restSeconds: Number(value) }))}
                options={['60', '90', '120', '180'].map((s) => ({
                  value: s,
                  label: `${Number(s) / 60}m`,
                }))}
              />
            </div>
          }
        />
      </Card>

      <SectionLabel>Logs</SectionLabel>
      <Card className="py-1">
        <LinkRow
          to="/logs/manage"
          title="Manage logs"
          text="Switch logs on or off and set their order"
        />
      </Card>

      <SectionLabel>Data & storage</SectionLabel>
      <DataSection />
    </div>
  )
}

export function Row({
  title,
  text,
  control,
}: {
  title: string
  text?: string
  control: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-2 last:pb-2">
      <div className="min-w-0">
        <p className="text-body">{title}</p>
        {text && <p className="text-label text-ink-2">{text}</p>}
      </div>
      {control}
    </div>
  )
}

function LinkRow({ to, title, text }: { to: string; title: string; text?: string }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-body">{title}</span>
        {text && <span className="text-label text-ink-2">{text}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-3" />
    </Link>
  )
}

async function storageInfo() {
  const [entries, estimate, persisted] = await Promise.all([
    countEntries(),
    storageEstimate(),
    navigator.storage?.persisted?.().catch(() => false) ?? false,
  ])
  return { entries, usage: estimate?.usage ?? null, persisted }
}

function DataSection() {
  const info = useLiveQuery(storageInfo)
  const backup = useBackupStatus()
  const [confirmReset, setConfirmReset] = useState(false)

  async function reset() {
    await resetAllData()
    location.assign(import.meta.env.BASE_URL)
  }

  return (
    <>
      <Card className="flex flex-col divide-y divide-line py-1">
        <Row
          title="Stored entries"
          control={
            <span className="text-label text-ink-2 tnum">
              {info ? `${info.entries} entries` : '…'}
              {info?.usage != null && ` · ${formatBytes(info.usage)}`}
            </span>
          }
        />
        <LinkRow to="/backup" title="Backup & restore" text={describeBackup(backup)} />
        <div className="flex items-start gap-3 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-ink-2" />
          <p className="text-label text-ink-2">
            Everything is stored on this device only
            {info?.persisted ? ', and the browser has agreed to keep it' : ''}. No account, no
            tracking.
          </p>
        </div>
      </Card>
      <div className="flex justify-center pt-4">
        {confirmReset ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
            <span className="text-label">
              Delete every log on this device? This can't be undone.
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="h-9 rounded-full px-3 text-label"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={reset}
                className="h-9 rounded-full bg-danger px-4 text-label font-semibold text-white"
              >
                Delete all
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="text-label font-medium text-danger"
          >
            Reset all local data
          </button>
        )}
      </div>
    </>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}
