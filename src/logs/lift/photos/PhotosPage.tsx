// Lift › Photos: grid by month, add, and pick two to compare.

import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Columns2, ImagePlus, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { EmptyState } from '../../../components/ui'
import type { ProgressPhoto } from '../../../data/db'
import { listPhotos } from '../../../data/photos'
import { shortDate } from '../../../lib/dates'
import { AddPhotoSheet } from './AddPhotoSheet'
import { useImageBytes } from './useImageBytes'

export function PhotosPage() {
  const photos = useLiveQuery(listPhotos)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const adding = params.get('add') === '1'
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  if (!photos) return null

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id].slice(-2)
    setSelected(next)
    if (next.length === 2) navigate(`/lift/photos/compare?a=${next[0]}&b=${next[1]}`)
  }

  const months = new Map<string, ProgressPhoto[]>()
  for (const photo of photos) {
    const key = new Date(photo.takenAt).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    months.set(key, [...(months.get(key) ?? []), photo])
  }

  return (
    <div className="flex flex-col gap-4 pb-16">
      {photos.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title="No progress photos yet"
          text="Take one now and then every week or two — same pose, same light. Comparing them shows change the scale can't."
          action={
            <button
              type="button"
              onClick={() => setParams({ add: '1' }, { replace: true })}
              className="h-11 rounded-full bg-accent px-5 font-semibold text-white"
            >
              Add photo
            </button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-label text-ink-2">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </p>
            {photos.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  setSelecting((on) => !on)
                  setSelected([])
                }}
                className="flex h-9 items-center gap-1.5 rounded-full bg-card px-3 text-label font-medium"
                aria-pressed={selecting}
              >
                {selecting ? <X className="size-4" /> : <Columns2 className="size-4" />}
                {selecting ? 'Cancel' : 'Compare'}
              </button>
            )}
          </div>
          {selecting && (
            <p role="status" className="rounded-xl bg-accent/10 px-4 py-2 text-label text-accent">
              Pick two photos to compare ({selected.length}/2)
            </p>
          )}
          {[...months.entries()].map(([month, items]) => (
            <section key={month} aria-label={month}>
              <h2 className="mb-2 px-1 text-meta uppercase text-ink-3">{month}</h2>
              <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
                {items.map((photo) => (
                  <li key={photo.id}>
                    <Thumb
                      photo={photo}
                      selecting={selecting}
                      selected={selected.includes(photo.id)}
                      onSelect={() => toggle(photo.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {photos.length > 0 && !selecting && (
        <button
          type="button"
          onClick={() => setParams({ add: '1' }, { replace: true })}
          className="fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white shadow-float active:scale-95 lg:bottom-8"
        >
          <Plus className="size-5" /> Add photo
        </button>
      )}
      <AddPhotoSheet open={adding} onClose={() => setParams({}, { replace: true })} />
    </div>
  )
}

function Thumb({
  photo,
  selecting,
  selected,
  onSelect,
}: {
  photo: ProgressPhoto
  selecting: boolean
  selected: boolean
  onSelect: () => void
}) {
  const img = useImageBytes(photo.thumb, photo.mime)
  const label = `Photo from ${shortDate(photo.takenAt)}${photo.note ? ` — ${photo.note}` : ''}`
  const image = (
    <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-card-2">
      <img ref={img} alt="" className="h-full w-full object-cover" />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 px-2 pt-4 pb-1 text-meta text-white tnum">
        {shortDate(photo.takenAt)}
      </span>
      {selecting && (
        <span
          className={`absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full border-2 border-white ${
            selected ? 'bg-accent' : 'bg-black/30'
          }`}
        >
          {selected && <Check className="size-3.5 text-white" strokeWidth={3} />}
        </span>
      )}
    </span>
  )
  return selecting ? (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      className="block w-full"
    >
      {image}
    </button>
  ) : (
    <Link to={`/lift/photos/${photo.id}`} aria-label={label} className="block">
      {image}
    </Link>
  )
}
