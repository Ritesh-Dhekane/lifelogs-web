// Offers to install LifeLogs as an app; hidden when it's already installed or can't be.

import { Download, Share } from 'lucide-react'

import { promptInstall, useInstall } from '../lib/install'
import { Card } from './ui'

export function InstallCard() {
  const install = useInstall()
  if (install.kind === 'installed' || install.kind === 'none') return null
  return (
    <Card className="flex items-start gap-3">
      <img
        src={`${import.meta.env.BASE_URL}icon.svg`}
        alt=""
        className="size-10 shrink-0 rounded-[11px]"
      />
      <div className="flex-1">
        <p className="text-body font-medium">Install LifeLogs</p>
        {install.kind === 'prompt' ? (
          <>
            <p className="text-label text-ink-2">
              Opens like an app from your home screen or dock, full screen and offline.
            </p>
            <button
              type="button"
              onClick={promptInstall}
              className="mt-3 flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-label font-semibold text-on-accent"
            >
              <Download className="size-4" /> Install
            </button>
          </>
        ) : (
          <p className="text-label text-ink-2">
            In Safari, tap <Share className="inline size-4 align-text-bottom" aria-label="Share" />{' '}
            then <strong>Add to Home Screen</strong>.
          </p>
        )}
      </div>
    </Card>
  )
}
