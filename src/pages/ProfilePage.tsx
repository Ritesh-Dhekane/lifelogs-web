// Profile: name, height, goal and target weight (used by the Weight screen and Today).

import { useLiveQuery } from 'dexie-react-hooks'
import { Check, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Card } from '../components/ui'
import type { Profile } from '../data/db'
import { getProfile, saveProfile } from '../data/repos'
import { usePrefs } from '../lib/prefs'
import { fromKg, round1, toKg } from '../lib/units'

export function ProfilePage() {
  const profile = useLiveQuery(getProfile)
  if (!profile) return null
  return <ProfileForm key={profile.updatedAt || 'new'} profile={profile} />
}

function ProfileForm({ profile }: { profile: Profile }) {
  const unit = usePrefs().units.weight
  const [name, setName] = useState(profile.name ?? '')
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : '')
  const [goal, setGoal] = useState(profile.goal ?? '')
  const [target, setTarget] = useState(
    profile.targetWeightKg ? String(round1(fromKg(profile.targetWeightKg, unit))) : '',
  )
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    const heightCm = height.trim() ? Number(height) : null
    const targetValue = target.trim() ? Number(target.replace(',', '.')) : null
    if (heightCm !== null && (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250)) {
      setError('Height should be between 100 and 250 cm.')
      return
    }
    const targetKg = targetValue === null ? null : toKg(targetValue, unit)
    if (targetKg !== null && (!Number.isFinite(targetKg) || targetKg < 20 || targetKg > 400)) {
      setError('That target weight looks off.')
      return
    }
    await saveProfile({
      name: name.trim() || null,
      heightCm,
      goal: goal.trim() || null,
      targetWeightKg: targetKg === null ? null : round1(targetKg * 10) / 10,
    })
    setError('')
    setSaved(true)
  }

  const input =
    'h-12 w-full rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent'
  return (
    <form onSubmit={save} className="mx-auto flex w-full max-w-xl flex-col gap-4" noValidate>
      <div className="flex flex-col items-center gap-2 py-2">
        <span className="grid size-20 place-items-center rounded-full bg-card-2 text-ink-2">
          <UserRound className="size-10" strokeWidth={1.5} />
        </span>
        <p className="text-title">{name.trim() || 'Your profile'}</p>
      </div>
      <Card className="flex flex-col gap-4">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => (setName(e.target.value), setSaved(false))}
            maxLength={40}
            autoComplete="given-name"
            className={input}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height (cm)">
            <input
              value={height}
              onChange={(e) => (setHeight(e.target.value.replace(/[^\d.]/g, '')), setSaved(false))}
              inputMode="decimal"
              className={input}
              placeholder="178"
            />
          </Field>
          <Field label={`Target weight (${unit})`}>
            <input
              value={target}
              onChange={(e) => (setTarget(e.target.value), setSaved(false))}
              inputMode="decimal"
              className={input}
              placeholder="—"
            />
          </Field>
        </div>
        <Field label="Goal">
          <input
            value={goal}
            onChange={(e) => (setGoal(e.target.value), setSaved(false))}
            maxLength={80}
            className={input}
            placeholder="e.g. Get stronger, lean cut"
          />
        </Field>
      </Card>
      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-on-accent active:scale-[0.98]"
      >
        {saved ? (
          <>
            <Check className="size-5" /> Saved
          </>
        ) : (
          'Save'
        )}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="px-1 text-label font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}
