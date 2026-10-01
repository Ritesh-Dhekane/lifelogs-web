// Settings: the only place where theme and units change.

import { Moon, Smartphone, Sun } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, SectionLabel, Segmented, Toggle } from '../components/ui'
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
