// Rest timer between sets: a bar at the bottom of the session with +30 s and Skip. The end time
// is kept in localStorage so it survives a reload. Vibrates (where supported) when time's up.

import { Hourglass } from 'lucide-react'
import { useEffect, useState } from 'react'

import { addRest, stopRest, useRestUntil } from './restStore'
import { formatClock } from './workoutStats'

export function RestTimer() {
  const until = useRestUntil()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!until) return
    const timer = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= until) {
        navigator.vibrate?.([200, 100, 200])
        stopRest()
      }
    }, 250)
    return () => clearInterval(timer)
  }, [until])

  if (!until || until <= now) return null
  const left = until - now

  return (
    <div
      role="timer"
      aria-label="Rest timer"
      className="fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-3 rounded-full bg-primary p-2 pl-3 text-on-primary shadow-float lg:bottom-6"
    >
      <span className="grid size-9 place-items-center rounded-full bg-on-primary/10 text-success">
        <Hourglass className="size-4" />
      </span>
      <span className="flex-1">
        <span className="block text-meta uppercase opacity-70">Rest</span>
        <span className="text-heading tnum">{formatClock(left + 999)}</span>
      </span>
      <button
        type="button"
        onClick={() => addRest(30)}
        className="h-9 rounded-full bg-on-primary/15 px-3 text-label font-semibold"
      >
        +30s
      </button>
      <button
        type="button"
        onClick={stopRest}
        className="h-9 rounded-full bg-on-primary/15 px-3 text-label font-semibold"
      >
        Skip
      </button>
    </div>
  )
}
