// Small pages: About and Not found.

import { Lock, MapPinOff } from 'lucide-react'
import { Link } from 'react-router'

import { InstallCard } from '../components/InstallCard'
import { Card, EmptyState } from '../components/ui'

export function AboutPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-6 text-center">
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-20 rounded-[22px]" />
      <div>
        <h1 className="text-title">LifeLogs</h1>
        <p className="text-label text-ink-2">Version {__APP_VERSION__}</p>
      </div>
      <p className="text-body text-ink-2">
        A calm tracker for your lifts and, one by one, the rest of your day.
      </p>
      <Card className="flex w-full items-start gap-3 text-left">
        <Lock className="mt-0.5 size-5 shrink-0 text-ink-2" />
        <p className="text-label text-ink-2">
          No account, no tracking, no ads. Everything you log is stored on this device; backups go
          only to places you pick.
        </p>
      </Card>
      <a
        className="text-label text-accent"
        href="https://github.com/Ritesh-Dhekane/lifelogs-web"
        target="_blank"
        rel="noreferrer"
      >
        Source code on GitHub
      </a>
      <div className="w-full text-left">
        <InstallCard />
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <EmptyState
      icon={MapPinOff}
      title="Nothing here"
      text="This page doesn't exist."
      action={
        <Link to="/" className="text-label font-medium text-accent">
          Go to Today
        </Link>
      }
    />
  )
}
