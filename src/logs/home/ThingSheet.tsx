// Add or edit a thing (an item you own, or a document with an expiry date), with an optional
// photo of the item or its receipt.

import { useLiveQuery } from 'dexie-react-hooks'
import { ImagePlus, LoaderCircle, Trash2, X } from 'lucide-react'
import { useCallback, useRef, useState, type FormEvent } from 'react'

import { Sheet } from '../../components/Sheet'
import { Segmented } from '../../components/ui'
import type { Thing, ThingKind } from '../../data/db'
import { addThing, deleteThing, getAttachment, setThingPhoto, updateThing } from '../../data/things'
import { prepareImage } from '../../lib/images'
import { amountInputValue, currencySymbol, parseAmount } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { useImageBytes } from '../lift/photos/useImageBytes'
import { REMIND_OPTIONS, THING_CATEGORIES } from './labels'

export function ThingSheet({
  open,
  onClose,
  thing,
  startKind = 'item',
}: {
  open: boolean
  onClose: () => void
  thing: Thing | null
  startKind?: ThingKind
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={thing ? thing.name : startKind === 'document' ? 'New document' : 'New item'}
    >
      {open && (
        <ThingForm
          key={thing?.id ?? `new-${startKind}`}
          thing={thing}
          startKind={startKind}
          onDone={onClose}
        />
      )}
    </Sheet>
  )
}

function ThingForm({
  thing,
  startKind,
  onDone,
}: {
  thing: Thing | null
  startKind: ThingKind
  onDone: () => void
}) {
  const { currency } = usePrefs()
  const [kind, setKind] = useState<ThingKind>(thing?.kind ?? startKind)
  const [name, setName] = useState(thing?.name ?? '')
  const [category, setCategory] = useState(thing?.category ?? 'other')
  const [place, setPlace] = useState(thing?.place ?? '')
  const [boughtOn, setBoughtOn] = useState(thing?.boughtOn ?? '')
  const [price, setPrice] = useState(
    thing?.priceMinor ? amountInputValue(thing.priceMinor, currency) : '',
  )
  const [expiresOn, setExpiresOn] = useState(thing?.expiresOn ?? '')
  const [remindDays, setRemindDays] = useState(thing?.remindDays ?? 30)
  const [note, setNote] = useState(thing?.note ?? '')
  const [photo, setPhoto] = useState<Blob | null | 'remove'>(null) // null = unchanged
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const saved = useLiveQuery(() => getAttachment(thing?.photoId ?? null), [thing?.photoId])

  const isItem = kind === 'item'
  const categories = THING_CATEGORIES[kind]

  async function save(event: FormEvent) {
    event.preventDefault()
    const priceMinor = price.trim() ? parseAmount(price, currency) : null
    if (price.trim() && priceMinor === null) return setError('Enter a price more than zero.')
    const input = {
      kind,
      name,
      category: categories.some((c) => c.value === category) ? category : 'other',
      place,
      boughtOn: isItem ? boughtOn || null : null,
      priceMinor: isItem ? priceMinor : null,
      expiresOn: expiresOn || null,
      remindDays,
      note,
    }
    setSaving(true)
    try {
      const id = thing ? (await updateThing(thing.id, input), thing.id) : (await addThing(input)).id
      if (photo === 'remove') await setThingPhoto(id, null)
      else if (photo) await setThingPhoto(id, await prepareImage(photo))
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.")
      setSaving(false)
    }
  }

  async function remove() {
    if (!thing) return
    await deleteThing(thing.id)
    onDone()
  }

  const field =
    'h-12 w-full rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent'
  const showSaved = photo === null && saved
  const preview = photo instanceof Blob ? photo : null

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      {!thing && (
        <Segmented<ThingKind>
          label="Kind"
          value={kind}
          onChange={(value) => {
            setKind(value)
            setCategory('other')
          }}
          options={[
            { value: 'item', label: 'Item' },
            { value: 'document', label: 'Document' },
          ]}
        />
      )}

      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">Name</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          maxLength={80}
          placeholder={isItem ? 'e.g. Samsung TV' : 'e.g. Passport'}
          data-autofocus={thing ? undefined : true}
          className={field}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">
            {isItem ? 'Where is it?' : 'Issued by'}
          </span>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            maxLength={80}
            placeholder={isItem ? 'Living room' : 'e.g. LIC'}
            className={field}
          />
        </label>
      </div>

      {isItem && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className="px-1 text-label font-medium text-ink-2">Bought on</span>
            <input
              type="date"
              value={boughtOn}
              onChange={(e) => setBoughtOn(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="px-1 text-label font-medium text-ink-2">Price</span>
            <span className="flex items-center gap-2 rounded-xl bg-card-2 px-4 focus-within:ring-2 focus-within:ring-accent">
              <span className="text-body text-ink-2">{currencySymbol(currency)}</span>
              <input
                inputMode="decimal"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value)
                  setError('')
                }}
                placeholder="Optional"
                className="h-12 w-full bg-transparent text-body tnum outline-none"
              />
            </span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">
            {isItem ? 'Warranty until' : 'Expires on'}
          </span>
          <input
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="px-1 text-label font-medium text-ink-2">Remind me</span>
          <select
            value={remindDays}
            onChange={(e) => setRemindDays(Number(e.target.value))}
            disabled={!expiresOn}
            className={`${field} disabled:opacity-50`}
          >
            {REMIND_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days < 60 ? `${days} days` : `${Math.round(days / 30)} months`} before
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">
          Photo{' '}
          <span className="font-normal text-ink-3">
            · {isItem ? 'item or receipt' : 'optional'}
          </span>
        </span>
        {preview || showSaved ? (
          <div className="flex items-center gap-3">
            {preview ? <BlobThumb blob={preview} /> : <SavedThumb thing={thing!} />}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="h-10 rounded-full bg-card-2 px-4 text-label font-medium"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => setPhoto(thing?.photoId ? 'remove' : null)}
              className="flex h-10 items-center gap-1 rounded-full px-3 text-label font-medium text-ink-2"
            >
              <X className="size-4" /> Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-card-2/50 text-label font-medium text-ink-2"
          >
            <ImagePlus className="size-4" /> Add a photo
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) setPhoto(file)
          }}
        />
        {!isItem && (
          <p className="px-1 text-meta text-ink-3 normal-case tracking-normal">
            No need to photograph ID numbers — the name and expiry date are enough for reminders.
          </p>
        )}
      </div>

      <label className="flex flex-col gap-2">
        <span className="flex justify-between px-1 text-label font-medium text-ink-2">
          Note <span className="font-normal text-ink-3">Optional</span>
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder={isItem ? 'e.g. Model, serial, service centre' : 'e.g. Renew online'}
          className={field}
        />
      </label>

      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-on-accent active:scale-[0.98] disabled:opacity-60"
      >
        {saving && <LoaderCircle className="size-4 animate-spin" />} Save
      </button>

      {thing &&
        (confirmDelete ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
            <span className="text-label">Delete {thing.name}?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-9 rounded-full px-3 text-label"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                className="h-9 rounded-full bg-danger px-4 text-label font-semibold text-on-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-2 py-2 text-label font-medium text-danger"
          >
            <Trash2 className="size-4" /> Delete
          </button>
        ))}
    </form>
  )
}

function BlobThumb({ blob }: { blob: Blob }) {
  // A blob: URL that lives exactly as long as the <img>.
  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return
      const url = URL.createObjectURL(blob)
      img.src = url
      return () => URL.revokeObjectURL(url)
    },
    [blob],
  )
  return <img ref={ref} alt="New photo" className="size-16 rounded-xl bg-card-2 object-cover" />
}

function SavedThumb({ thing }: { thing: Thing }) {
  const attachment = useLiveQuery(() => getAttachment(thing.photoId), [thing.photoId])
  const img = useImageBytes(attachment?.thumb, attachment?.mime)
  return (
    <img
      ref={img}
      alt={`Photo of ${thing.name}`}
      className="size-16 rounded-xl bg-card-2 object-cover"
    />
  )
}
