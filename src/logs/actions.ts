// Quick actions each log offers from the "+" sheet and the Today screen.

import { Dumbbell, Scale, type LucideIcon } from 'lucide-react'

import type { LogId } from './registry'

export interface QuickAction {
  label: string
  hint: string
  icon: LucideIcon
  to: string
}

export function quickActions(log: LogId): QuickAction[] {
  switch (log) {
    case 'lift':
      return [
        { label: 'Log weight', hint: 'Body weight', icon: Scale, to: '/lift/weight?add=1' },
        {
          label: 'Start workout',
          hint: 'New session',
          icon: Dumbbell,
          to: '/lift/workouts/session',
        },
      ]
    default:
      return []
  }
}
