// Quick actions each log offers from the "+" sheet and the Today screen.

import { Dumbbell, Scale, type LucideIcon } from 'lucide-react'

import type { LogId } from './registry'

export interface QuickAction {
  label: string
  hint: string
  icon: LucideIcon
  to: string
}

export function quickActions(
  log: LogId,
  state: { workoutInProgress?: boolean } = {},
): QuickAction[] {
  switch (log) {
    case 'lift':
      return [
        { label: 'Log weight', hint: 'Body weight', icon: Scale, to: '/lift/weight?add=1' },
        {
          label: state.workoutInProgress ? 'Resume workout' : 'Start workout',
          hint: state.workoutInProgress ? 'In progress' : 'New session',
          icon: Dumbbell,
          to: '/lift/workouts/session',
        },
      ]
    default:
      return []
  }
}
