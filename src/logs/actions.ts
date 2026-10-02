// Quick actions each log offers from the "+" sheet and the Today screen.

import {
  Dumbbell,
  FileText,
  Fuel,
  Package,
  Receipt,
  Repeat,
  Scale,
  type LucideIcon,
} from 'lucide-react'

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
    case 'expenses':
      return [
        {
          label: 'Add expense',
          hint: 'Spent money',
          icon: Receipt,
          to: '/expenses/spending?add=1',
        },
        {
          label: 'Add a bill',
          hint: 'Bill or subscription',
          icon: Repeat,
          to: '/expenses/recurring?add=1',
        },
      ]
    case 'home':
      return [
        { label: 'Add fuel', hint: 'Fill-up, mileage', icon: Fuel, to: '/home/vehicles?add=fuel' },
        {
          label: 'Add item',
          hint: 'Warranty, receipt',
          icon: Package,
          to: '/home/things?add=item',
        },
        {
          label: 'Add document',
          hint: 'Expiry reminder',
          icon: FileText,
          to: '/home/things?add=document',
        },
      ]
    default:
      return []
  }
}
