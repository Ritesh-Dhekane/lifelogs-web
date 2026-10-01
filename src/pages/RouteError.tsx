// Shown when a screen fails to load or crashes. Right after an update the usual cause is a stale
// copy of the app, which a reload fixes. Data on the device is never touched.

import { RefreshCw, TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { EmptyState } from '../components/ui'
import { NotFoundPage } from './simple'

export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  console.error(error)
  return (
    <EmptyState
      icon={TriangleAlert}
      title="This screen didn't load"
      text="Your data is safe on this device. Reloading usually fixes it, especially right after an update."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => location.reload()}
            className="flex h-11 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-on-accent"
          >
            <RefreshCw className="size-4" /> Reload
          </button>
          <Link
            to="/"
            reloadDocument
            className="flex h-11 items-center rounded-full bg-card px-5 font-medium"
          >
            Go to Today
          </Link>
        </div>
      }
    />
  )
}
