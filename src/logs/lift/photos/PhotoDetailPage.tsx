// One progress photo (full size) with its date, note and the weigh-in closest to it; plus the
// side-by-side compare view.

import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import type { ProgressPhoto, WeightEntry } from '../../../data/db'
import { deletePhoto, getPhoto, updatePhoto } from '../../../data/photos'
import { listWeights } from '../../../data/repos'
import { dateTimeLabel, fromLocalInput, shortDate, toLocalInput } from '../../../lib/dates'
import { usePrefs } from '../../../lib/prefs'
import { formatWeight } from '../../../lib/units'
import { DAY, nearestWeight } from './nearestWeight'
import { useImageBytes } from './useImageBytes'

export function PhotoDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const photo = useLiveQuery(() => getPhoto(id), [id])
  const weights = useLiveQuery(listWeights)
  const unit = usePrefs().units.weight
  const [confirm, setConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const img = useImageBytes(photo?.data, photo?.mime)

  if (photo === undefined && weights !== undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-heading">This photo no longer exists</p>
        <Link to="/lift/photos" className="text-label font-medium text-accent">
          Back to photos
        </Link>
      </div>
    )
  }
  if (!photo || !weights) return null
  const weight = nearestWeight(weights, photo.takenAt)

  return (
    <div className="flex flex-col gap-4 pb-8">
      <Link to="/lift/photos" className="flex items-center gap-1 text-label text-ink-2">
        <ChevronLeft className="size-4" /> Photos
      </Link>
      <div className="overflow-hidden rounded-[18px] bg-card-2">
        <img
          ref={img}
          alt={`Progress photo from ${shortDate(photo.takenAt)}`}
          className="mx-auto max-h-[70svh] w-auto object-contain"
        />
      </div>
      {editing ? (
        <EditPhoto photo={photo} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <p className="text-heading">{dateTimeLabel(photo.takenAt)}</p>
            {weight && (
              <p className="text-label text-ink-2 tnum">
                {formatWeight(weight.weightKg, unit)} on {shortDate(weight.recordedAt)}
              </p>
            )}
            {photo.note && <p className="mt-1 text-body">{photo.note}</p>}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="grid size-10 place-items-center rounded-full bg-card"
            aria-label="Edit date and note"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      )}
      {confirm ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
          <span className="text-label">Delete this photo?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="h-9 rounded-full px-3 text-label"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                await deletePhoto(photo.id)
                navigate('/lift/photos')
              }}
              className="h-9 rounded-full bg-danger px-4 text-label font-semibold text-white"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="flex items-center justify-center gap-2 py-2 text-label font-medium text-danger"
        >
          <Trash2 className="size-4" /> Delete photo
        </button>
      )}
    </div>
  )
}

function EditPhoto({ photo, onDone }: { photo: ProgressPhoto; onDone: () => void }) {
  const [when, setWhen] = useState(() => toLocalInput(photo.takenAt))
  const [note, setNote] = useState(photo.note ?? '')
  const field = 'h-12 rounded-xl bg-card px-4 text-body outline-none focus:ring-2 focus:ring-accent'
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        await updatePhoto(photo.id, { takenAt: fromLocalInput(when), note })
        onDone()
      }}
      className="flex flex-col gap-3"
    >
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className={field}
        aria-label="Date and time"
        required
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="Note"
        className={field}
        aria-label="Note"
      />
      <button type="submit" className="h-11 rounded-full bg-accent font-semibold text-white">
        Save
      </button>
    </form>
  )
}

export function PhotoComparePage() {
  const [params] = useSearchParams()
  const ids = [params.get('a') ?? '', params.get('b') ?? '']
  const photos = useLiveQuery(() => Promise.all(ids.map((id) => getPhoto(id))), [ids.join()])
  const weights = useLiveQuery(listWeights)
  const unit = usePrefs().units.weight
  if (!photos || !weights) return null
  // Oldest on the left, whichever order they were tapped in.
  const [left, right] = photos
    .filter(Boolean)
    .sort((a, b) => a!.takenAt.localeCompare(b!.takenAt)) as ProgressPhoto[]
  if (!left || !right) {
    return (
      <p className="py-16 text-center text-label text-ink-2">
        Pick two photos to compare.{' '}
        <Link to="/lift/photos" className="text-accent">
          Back to photos
        </Link>
      </p>
    )
  }
  const days = Math.round(
    (new Date(right.takenAt).getTime() - new Date(left.takenAt).getTime()) / DAY,
  )
  const wl = nearestWeight(weights, left.takenAt)
  const wr = nearestWeight(weights, right.takenAt)

  return (
    <div className="flex flex-col gap-4 pb-8">
      <Link to="/lift/photos" className="flex items-center gap-1 text-label text-ink-2">
        <ChevronLeft className="size-4" /> Photos
      </Link>
      <p className="px-1 text-heading">
        {days} {days === 1 ? 'day' : 'days'} apart
        {wl && wr && (
          <span className="text-body font-normal text-ink-2 tnum">
            {' '}
            · {wr.weightKg - wl.weightKg >= 0 ? '+' : '−'}
            {formatWeight(Math.abs(wr.weightKg - wl.weightKg), unit)}
          </span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Side photo={left} weight={wl} unit={unit} />
        <Side photo={right} weight={wr} unit={unit} />
      </div>
    </div>
  )
}

function Side({
  photo,
  weight,
  unit,
}: {
  photo: ProgressPhoto
  weight: WeightEntry | null
  unit: 'kg' | 'lb'
}) {
  const img = useImageBytes(photo.data, photo.mime)
  return (
    <figure className="flex flex-col gap-2">
      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-card-2">
        <img
          ref={img}
          alt={`Photo from ${shortDate(photo.takenAt)}`}
          className="h-full w-full object-cover"
        />
      </div>
      <figcaption className="px-1 text-label">
        <span className="block font-semibold">{shortDate(photo.takenAt)}</span>
        {weight && <span className="text-ink-2 tnum">{formatWeight(weight.weightKg, unit)}</span>}
      </figcaption>
    </figure>
  )
}
