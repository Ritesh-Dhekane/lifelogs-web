// Adding a progress photo: take one (in-app camera or the phone's camera app) or pick from the
// gallery, then confirm date and note.

import { Camera, Images, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { Sheet } from '../../../components/Sheet'
import { addPhoto } from '../../../data/photos'
import { fromLocalInput, toLocalInput } from '../../../lib/dates'
import { prepareImage } from '../../../lib/images'
import { CameraView } from './CameraView'

type Picked = { blob: Blob; takenAt: string; preview: string }

export function AddPhotoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [picked, setPicked] = useState<Picked | null>(null)
  const [camera, setCamera] = useState(false)
  const systemCamera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  // Free the preview URL when it's replaced or the sheet closes.
  useEffect(
    () => () => {
      if (picked) URL.revokeObjectURL(picked.preview)
    },
    [picked],
  )

  function close() {
    setPicked(null)
    setCamera(false)
    onClose()
  }

  function pick(blob: Blob, takenAt: string) {
    setCamera(false)
    setPicked({ blob, takenAt, preview: URL.createObjectURL(blob) })
  }

  function fromInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    // Gallery picks keep the file's own date when it has one (and it isn't in the future).
    const fileTime =
      file.lastModified && file.lastModified < Date.now() ? file.lastModified : Date.now()
    pick(file, new Date(fileTime).toISOString())
  }

  const fallback = useCallback(() => {
    setCamera(false)
    systemCamera.current?.click()
  }, [])

  return (
    <>
      <Sheet open={open} onClose={close} title={picked ? 'New photo' : 'Add progress photo'}>
        <input
          ref={systemCamera}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={fromInput}
        />
        <input ref={gallery} type="file" accept="image/*" hidden onChange={fromInput} />
        {picked ? (
          <ConfirmPhoto
            key={picked.preview}
            picked={picked}
            onRetake={() => setPicked(null)}
            onSaved={close}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-2">
            <button
              type="button"
              onClick={() => setCamera(true)}
              className="flex flex-col items-start gap-3 rounded-[18px] bg-card-2 p-4 text-left active:scale-[0.98]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-card text-lift">
                <Camera className="size-5" />
              </span>
              <span>
                <span className="block text-body font-semibold">Take photo</span>
                <span className="text-label text-ink-2">With a framing guide</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => gallery.current?.click()}
              className="flex flex-col items-start gap-3 rounded-[18px] bg-card-2 p-4 text-left active:scale-[0.98]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-card text-accent">
                <Images className="size-5" />
              </span>
              <span>
                <span className="block text-body font-semibold">From gallery</span>
                <span className="text-label text-ink-2">Pick an existing photo</span>
              </span>
            </button>
            <p className="col-span-2 px-1 pt-1 text-label text-ink-3">
              Photos stay on this device and are included in your backups.
            </p>
          </div>
        )}
      </Sheet>
      {camera && (
        <CameraView
          onCapture={(blob) => pick(blob, new Date().toISOString())}
          onFallback={fallback}
          onClose={() => setCamera(false)}
        />
      )}
    </>
  )
}

function ConfirmPhoto({
  picked,
  onRetake,
  onSaved,
}: {
  picked: Picked
  onRetake: () => void
  onSaved: () => void
}) {
  const [when, setWhen] = useState(() => toLocalInput(picked.takenAt))
  const [maxWhen] = useState(() => toLocalInput(new Date().toISOString()))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const { image, thumb } = await prepareImage(picked.blob)
      await addPhoto({ takenAt: fromLocalInput(when), note, image, thumb })
      onSaved()
    } catch {
      setError("That image couldn't be read. Try another photo.")
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <img
        src={picked.preview}
        alt="Preview of the new photo"
        className="max-h-[45svh] w-full rounded-[18px] bg-card-2 object-contain"
      />
      <label className="flex flex-col gap-2">
        <span className="px-1 text-label font-medium text-ink-2">Date & time</span>
        <input
          type="datetime-local"
          value={when}
          max={maxWhen}
          onChange={(event) => setWhen(event.target.value)}
          className="h-12 rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent"
          required
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="flex justify-between px-1 text-label font-medium text-ink-2">
          Note <span className="font-normal text-ink-3">Optional</span>
        </span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          placeholder="e.g. Front, morning, fasted"
          className="h-12 rounded-xl bg-card-2 px-4 text-body outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      {error && (
        <p role="alert" className="text-label text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRetake}
          className="h-12 flex-1 rounded-full bg-card-2 font-semibold"
        >
          Retake
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-on-accent disabled:opacity-60"
        >
          {saving && <LoaderCircle className="size-4 animate-spin" />} Save photo
        </button>
      </div>
    </form>
  )
}
