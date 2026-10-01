// In-app camera (asks for camera permission once). Falls back to the phone's own camera app when
// the browser can't open the camera or permission is refused.

import { Camera, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function CameraView({
  onCapture,
  onFallback,
  onClose,
}: {
  onCapture: (photo: Blob) => void
  onFallback: () => void // open the system camera instead
  onClose: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('user')
  const [ready, setReady] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  // Its own modal dialog so it stacks above the sheet that opened it.
  useEffect(() => {
    const el = dialog.current
    if (el && !el.open) el.showModal()
    return () => el?.close()
  }, [])

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      onFallback()
      return
    }
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().then(() => setReady(true))
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const name = error instanceof DOMException ? error.name : ''
        setProblem(
          name === 'NotAllowedError'
            ? 'Camera access was refused. You can allow it in the browser settings, or use your camera app.'
            : "The camera couldn't start. You can use your camera app instead.",
        )
      })
    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
      setReady(false)
    }
  }, [facing, onFallback])

  function capture() {
    const el = video.current
    if (!el || !ready) return
    const canvas = document.createElement('canvas')
    canvas.width = el.videoWidth
    canvas.height = el.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return
    if (facing === 'user') {
      // Un-mirror the selfie preview so the saved photo matches what others see.
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }
    context.drawImage(el, 0, 0)
    canvas.toBlob((blob) => blob && onCapture(blob), 'image/jpeg', 0.92)
  }

  return (
    <dialog
      ref={dialog}
      aria-label="Camera"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none flex-col bg-black p-0 text-white open:flex"
    >
      <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="grid size-11 place-items-center rounded-full bg-white/15"
          aria-label="Close camera"
        >
          <X className="size-5" />
        </button>
        <span className="text-label opacity-80">Same pose, same light, every time</span>
        <span className="size-11" />
      </div>
      <div className="relative flex-1 overflow-hidden">
        {problem ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-body">{problem}</p>
            <button
              type="button"
              onClick={onFallback}
              className="h-11 rounded-full bg-white px-5 font-semibold text-black"
            >
              Use camera app
            </button>
          </div>
        ) : (
          <>
            <video
              ref={video}
              playsInline
              muted
              className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
            />
            {/* Simple framing guide: keep your body inside the outline. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[18%] inset-y-[10%] rounded-[45%] border-2 border-dashed border-white/35"
            />
          </>
        )}
      </div>
      {!problem && (
        <div className="flex items-center justify-around p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <span className="size-12" />
          <button
            type="button"
            onClick={capture}
            disabled={!ready}
            className="grid size-20 place-items-center rounded-full border-4 border-white disabled:opacity-40"
            aria-label="Take photo"
          >
            <span className="grid size-16 place-items-center rounded-full bg-white text-black">
              <Camera className="size-6" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
            className="grid size-12 place-items-center rounded-full bg-white/15"
            aria-label="Switch camera"
          >
            <RefreshCw className="size-5" />
          </button>
        </div>
      )}
    </dialog>
  )
}
