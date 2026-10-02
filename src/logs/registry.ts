// Every log LifeLogs knows about. A log that's "ready" has screens and data; "soon" logs are shown
// in the hub so people can see what's coming. Adding a log = adding an entry here plus its folder
// under src/logs/<id>/ (screens, data, Today card, timeline items).

import {
  Brain,
  CheckSquare,
  Droplet,
  Dumbbell,
  Footprints,
  House,
  Smartphone,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { getPrefs, type Prefs } from '../lib/prefs'

export type LogId =
  'lift' | 'expenses' | 'home' | 'water' | 'meals' | 'distance' | 'screen' | 'thoughts' | 'tasks'

export interface LogDefinition {
  id: LogId
  name: string
  tagline: string
  icon: LucideIcon
  status: 'ready' | 'soon'
  path?: string // where the log lives once it's ready
  // Tailwind classes spelled out so the build can find them.
  color: { text: string; bg: string; soft: string }
}

export const LOGS: LogDefinition[] = [
  {
    id: 'lift',
    name: 'Lift',
    tagline: 'Body weight, workouts, strength and progress photos',
    icon: Dumbbell,
    status: 'ready',
    path: '/lift',
    color: { text: 'text-lift', bg: 'bg-lift', soft: 'bg-lift/12' },
  },
  {
    id: 'expenses',
    name: 'Expenses',
    tagline: 'Spending, budgets, bills and subscriptions',
    icon: Wallet,
    status: 'ready',
    path: '/expenses',
    color: { text: 'text-expenses-ink', bg: 'bg-expenses', soft: 'bg-expenses/12' },
  },
  {
    id: 'home',
    name: 'Home',
    tagline: 'Things, papers, vehicles and care — and what’s due',
    icon: House,
    status: 'ready',
    path: '/home',
    color: { text: 'text-home-ink', bg: 'bg-home', soft: 'bg-home/12' },
  },
  {
    id: 'water',
    name: 'Water',
    tagline: 'Daily hydration against a goal',
    icon: Droplet,
    status: 'soon',
    color: { text: 'text-water', bg: 'bg-water', soft: 'bg-water/12' },
  },
  {
    id: 'meals',
    name: 'Meals',
    tagline: 'What you ate, without counting every gram',
    icon: UtensilsCrossed,
    status: 'soon',
    color: { text: 'text-meals', bg: 'bg-meals', soft: 'bg-meals/12' },
  },
  {
    id: 'distance',
    name: 'Distance',
    tagline: 'Walks, runs, rides and every km travelled',
    icon: Footprints,
    status: 'soon',
    color: { text: 'text-distance', bg: 'bg-distance', soft: 'bg-distance/12' },
  },
  {
    id: 'screen',
    name: 'Screen Time',
    tagline: 'How long you spend on your phone',
    icon: Smartphone,
    status: 'soon',
    color: { text: 'text-screen', bg: 'bg-screen', soft: 'bg-screen/12' },
  },
  {
    id: 'thoughts',
    name: 'Thoughts',
    tagline: 'One-line reflections and a daily mood',
    icon: Brain,
    status: 'soon',
    color: { text: 'text-thoughts', bg: 'bg-thoughts', soft: 'bg-thoughts/12' },
  },
  {
    id: 'tasks',
    name: 'Tasks',
    tagline: 'A short list for today',
    icon: CheckSquare,
    status: 'soon',
    color: { text: 'text-tasks', bg: 'bg-tasks', soft: 'bg-tasks/12' },
  },
]

export function getLog(id: LogId): LogDefinition {
  return LOGS.find((log) => log.id === id)!
}

// Ready logs the user switched on, in their chosen order.
export function enabledLogs(prefs: Prefs = getPrefs()): LogDefinition[] {
  const order = prefs.logs.order
  return LOGS.filter((log) => log.status === 'ready' && prefs.logs.enabled[log.id])
    .slice()
    .sort((a, b) => rank(order, a.id) - rank(order, b.id))
}

function rank(order: string[], id: string): number {
  const index = order.indexOf(id)
  return index === -1 ? order.length + LOGS.findIndex((log) => log.id === id) : index
}
