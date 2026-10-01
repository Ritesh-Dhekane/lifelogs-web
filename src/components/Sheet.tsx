// Bottom sheet on phones, centred dialog on larger screens. Built on <dialog> for focus handling,
// Escape to close and an inert background.

import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  actions?: ReactNode // e.g. a Save button shown in the header
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className="sheet m-0 mt-auto max-h-[92svh] w-full max-w-none rounded-t-[22px] bg-card p-0 text-ink shadow-float backdrop:bg-black/30 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-lg sm:rounded-[22px]"
    >
      <div className="flex max-h-[92svh] flex-col">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-ink-3/30 sm:hidden" aria-hidden />
        <header className="flex items-center gap-3 px-5 pt-3 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-card-2 text-ink-2 active:scale-95"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 id={titleId} className="text-heading">
              {title}
            </h2>
            {subtitle && <p className="text-meta uppercase text-ink-3">{subtitle}</p>}
          </div>
          <div className="flex min-w-9 justify-end">{actions}</div>
        </header>
        <div className="overflow-y-auto px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  )
}
