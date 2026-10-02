// Every table you can export, grouped by log. Dated entries follow the chosen date range; lists
// (categories, recurring bills, things, care tasks) are always exported whole.

import { listCareLogs, listCareTasks } from '../../data/care'
import { MUSCLE_LABEL } from '../../data/exercises'
import { listCategories, listExpenses } from '../../data/expenses'
import { listPhotos } from '../../data/photos'
import { listRecurring, yearlyCost } from '../../data/recurring'
import { listWeights } from '../../data/repos'
import { listThings } from '../../data/things'
import { listVehicleLogs, listVehicles } from '../../data/vehicles'
import { listWorkouts } from '../../data/workouts'
import { PAID_WITH_LABEL } from '../../logs/expenses/icons'
import { addMonths, monthKey } from '../../logs/expenses/stats'
import { CARE_GROUPS, THING_CATEGORIES, VEHICLE_LOG_LABEL } from '../../logs/home/labels'
import { careNextDue } from '../../logs/home/stats'
import { KIND_LABEL } from '../../logs/lift/labels'
import { summarize, musclesWorked } from '../../logs/lift/workoutStats'
import type { LogId } from '../../logs/registry'
import { toDay } from '../days'
import { toMajor, type CurrencyCode } from '../money'
import { fromKg } from '../units'
import type { WeightUnit } from '../prefs'
import type { ExportTable } from './table'

export interface ExportRange {
  from: string | null // "YYYY-MM-DD", inclusive
  to: string | null // inclusive
}

export interface ExportContext {
  unit: WeightUnit
  currency: CurrencyCode
  range: ExportRange
}

export interface Dataset {
  id: string
  log: LogId
  label: string
  description: string
  dated: boolean // follows the date range
  build: (ctx: ExportContext) => Promise<ExportTable>
}

function inRange(iso: string, range: ExportRange): boolean {
  const day = toDay(new Date(iso))
  return (!range.from || day >= range.from) && (!range.to || day <= range.to)
}

const round2 = (n: number) => Math.round(n * 100) / 100

export const DATASETS: Dataset[] = [
  // ---------- Lift ----------
  {
    id: 'weights',
    log: 'lift',
    label: 'Weights',
    description: 'Every weigh-in',
    dated: true,
    async build({ unit, range }) {
      const rows = (await listWeights()).filter((w) => inRange(w.recordedAt, range)).reverse()
      return {
        name: 'Weights',
        columns: [
          { header: 'Date', type: 'datetime', width: 18 },
          { header: `Weight (${unit})`, type: 'decimal', width: 12 },
          { header: 'Condition', type: 'text', width: 12 },
          { header: 'Note', type: 'text', width: 40 },
        ],
        rows: rows.map((w) => [
          w.recordedAt,
          round2(fromKg(w.weightKg, unit)),
          KIND_LABEL[w.kind],
          w.note,
        ]),
      }
    },
  },
  {
    id: 'workouts',
    log: 'lift',
    label: 'Workouts',
    description: 'One row per session: time, sets, volume',
    dated: true,
    async build({ unit, range }) {
      const rows = (await listWorkouts())
        .filter((d) => inRange(d.workout.startedAt, range))
        .reverse()
      return {
        name: 'Workouts',
        columns: [
          { header: 'Started', type: 'datetime', width: 18 },
          { header: 'Name', type: 'text', width: 18 },
          { header: 'Minutes', type: 'integer' },
          { header: 'Exercises', type: 'integer' },
          { header: 'Sets done', type: 'integer' },
          { header: `Volume (${unit})`, type: 'decimal', width: 14 },
          { header: 'Muscles', type: 'text', width: 28 },
          { header: 'Note', type: 'text', width: 40 },
        ],
        rows: rows.map((d) => {
          const s = summarize(d)
          return [
            d.workout.startedAt,
            d.workout.name,
            Math.round(s.durationMs / 60000),
            d.exercises.length,
            s.sets,
            round2(fromKg(s.volumeKg, unit)),
            musclesWorked(d)
              .map((m) => MUSCLE_LABEL[m])
              .join(', '),
            d.workout.note,
          ]
        }),
      }
    },
  },
  {
    id: 'sets',
    log: 'lift',
    label: 'Sets',
    description: 'Every set of every workout: exercise, reps, weight',
    dated: true,
    async build({ unit, range }) {
      const workouts = (await listWorkouts())
        .filter((d) => inRange(d.workout.startedAt, range))
        .reverse()
      const rows = workouts.flatMap((d) =>
        d.exercises.flatMap(({ exercise, sets }) =>
          sets.map((set, i) => [
            d.workout.startedAt,
            d.workout.name,
            exercise.name,
            MUSCLE_LABEL[exercise.muscle],
            i + 1,
            set.reps,
            set.weightKg === null ? null : round2(fromKg(set.weightKg, unit)),
            set.done,
          ]),
        ),
      )
      return {
        name: 'Sets',
        columns: [
          { header: 'Workout started', type: 'datetime', width: 18 },
          { header: 'Workout', type: 'text', width: 16 },
          { header: 'Exercise', type: 'text', width: 26 },
          { header: 'Muscle', type: 'text', width: 12 },
          { header: 'Set', type: 'integer', width: 6 },
          { header: 'Reps', type: 'integer', width: 6 },
          { header: `Weight (${unit})`, type: 'decimal', width: 12 },
          { header: 'Done', type: 'boolean', width: 7 },
        ],
        rows,
      }
    },
  },
  {
    id: 'photos',
    log: 'lift',
    label: 'Progress photos',
    description: 'Dates and notes (the images are in the backup file)',
    dated: true,
    async build({ range }) {
      const rows = (await listPhotos()).filter((p) => inRange(p.takenAt, range)).reverse()
      return {
        name: 'Progress photos',
        columns: [
          { header: 'Taken', type: 'datetime', width: 18 },
          { header: 'Note', type: 'text', width: 40 },
        ],
        rows: rows.map((p) => [p.takenAt, p.note]),
      }
    },
  },

  // ---------- Expenses ----------
  {
    id: 'expenses',
    log: 'expenses',
    label: 'Expenses',
    description: 'Every expense with category and payment',
    dated: true,
    async build({ currency, range }) {
      const [expenses, categories, recurring] = await Promise.all([
        listExpenses(),
        listCategories({ includeArchived: true }),
        listRecurring(),
      ])
      const category = new Map(categories.map((c) => [c.id, c.name]))
      const bill = new Map(recurring.map((r) => [r.id, r.name]))
      const rows = expenses.filter((e) => inRange(e.spentAt, range)).reverse()
      return {
        name: 'Expenses',
        columns: [
          { header: 'Date', type: 'datetime', width: 18 },
          { header: `Amount (${currency})`, type: 'money', width: 14 },
          { header: 'Category', type: 'text', width: 18 },
          { header: 'Paid with', type: 'text', width: 10 },
          { header: 'Note', type: 'text', width: 34 },
          { header: 'Added by', type: 'text', width: 18 },
        ],
        rows: rows.map((e) => [
          e.spentAt,
          toMajor(e.amountMinor, currency),
          category.get(e.categoryId) ?? 'Other',
          e.paidWith ? PAID_WITH_LABEL[e.paidWith] : null,
          e.note,
          e.recurringId
            ? `Recurring: ${bill.get(e.recurringId) ?? 'deleted'}`
            : e.linkedTo?.startsWith('vehicleLog:')
              ? 'Vehicle log'
              : null,
        ]),
      }
    },
  },
  {
    id: 'monthly',
    log: 'expenses',
    label: 'Monthly spending',
    description: 'A row per month, a column per category, with totals',
    dated: true,
    async build({ currency, range }) {
      const [expenses, categories] = await Promise.all([
        listExpenses(),
        listCategories({ includeArchived: true }),
      ])
      const inside = expenses.filter((e) => inRange(e.spentAt, range))
      const used = categories.filter((c) => inside.some((e) => e.categoryId === c.id))
      const months: string[] = []
      if (inside.length) {
        const first = monthKey(new Date(inside.at(-1)!.spentAt))
        const last = monthKey(new Date(inside[0]!.spentAt))
        for (let m = first; m <= last; m = addMonths(m, 1)) months.push(m)
      }
      const sums = new Map<string, number>()
      for (const e of inside) {
        const key = `${monthKey(new Date(e.spentAt))}|${e.categoryId}`
        sums.set(key, (sums.get(key) ?? 0) + e.amountMinor)
      }
      return {
        name: 'Monthly spending',
        columns: [
          { header: 'Month', type: 'month', width: 11 },
          ...used.map((c) => ({
            header: c.name,
            type: 'money' as const,
            width: Math.max(12, c.name.length + 2),
          })),
          { header: `Total (${currency})`, type: 'money', width: 14 },
        ],
        rows: months.map((m) => {
          const values = used.map((c) => sums.get(`${m}|${c.id}`) ?? 0)
          return [
            m,
            ...values.map((v) => toMajor(v, currency)),
            toMajor(
              values.reduce((a, b) => a + b, 0),
              currency,
            ),
          ]
        }),
      }
    },
  },
  {
    id: 'categories',
    log: 'expenses',
    label: 'Categories & budgets',
    description: 'Your categories and monthly budgets',
    dated: false,
    async build({ currency }) {
      const categories = await listCategories({ includeArchived: true })
      return {
        name: 'Categories',
        columns: [
          { header: 'Category', type: 'text', width: 20 },
          { header: `Monthly budget (${currency})`, type: 'money', width: 20 },
          { header: 'Hidden', type: 'boolean', width: 8 },
          { header: 'Custom', type: 'boolean', width: 8 },
        ],
        rows: categories.map((c) => [
          c.name,
          c.budgetMinor ? toMajor(c.budgetMinor, currency) : null,
          c.archived,
          c.isCustom,
        ]),
      }
    },
  },
  {
    id: 'recurring',
    log: 'expenses',
    label: 'Bills & subscriptions',
    description: 'Recurring payments and what they cost per year',
    dated: false,
    async build({ currency }) {
      const [items, categories] = await Promise.all([
        listRecurring(),
        listCategories({ includeArchived: true }),
      ])
      const category = new Map(categories.map((c) => [c.id, c.name]))
      return {
        name: 'Bills & subscriptions',
        columns: [
          { header: 'Name', type: 'text', width: 20 },
          { header: 'Kind', type: 'text', width: 12 },
          { header: `Amount (${currency})`, type: 'money', width: 14 },
          { header: 'Repeats', type: 'text', width: 9 },
          { header: 'Next due', type: 'day', width: 12 },
          { header: `Per year (${currency})`, type: 'money', width: 14 },
          { header: 'Category', type: 'text', width: 16 },
          { header: 'Auto-added', type: 'boolean', width: 11 },
          { header: 'Active', type: 'boolean', width: 8 },
          { header: 'Note', type: 'text', width: 30 },
        ],
        rows: items.map((r) => [
          r.name,
          r.kind === 'subscription' ? 'Subscription' : 'Bill',
          toMajor(r.amountMinor, currency),
          r.cadence[0]!.toUpperCase() + r.cadence.slice(1),
          r.nextDue,
          toMajor(yearlyCost(r), currency),
          category.get(r.categoryId) ?? 'Other',
          r.autoLog,
          r.active,
          r.note,
        ]),
      }
    },
  },

  // ---------- Home ----------
  {
    id: 'things',
    log: 'home',
    label: 'Things & documents',
    description: 'Items, warranties and document expiry dates',
    dated: false,
    async build({ currency }) {
      const things = await listThings()
      const categoryLabel = (kind: 'item' | 'document', value: string) =>
        THING_CATEGORIES[kind].find((c) => c.value === value)?.label ?? 'Other'
      return {
        name: 'Things & documents',
        columns: [
          { header: 'Kind', type: 'text', width: 10 },
          { header: 'Name', type: 'text', width: 24 },
          { header: 'Category', type: 'text', width: 18 },
          { header: 'Where / issued by', type: 'text', width: 18 },
          { header: 'Bought on', type: 'day', width: 12 },
          { header: `Price (${currency})`, type: 'money', width: 13 },
          { header: 'Warranty until / expires', type: 'day', width: 22 },
          { header: 'Remind days before', type: 'integer', width: 18 },
          { header: 'Note', type: 'text', width: 34 },
        ],
        rows: things.map((t) => [
          t.kind === 'item' ? 'Item' : 'Document',
          t.name,
          categoryLabel(t.kind, t.category),
          t.place,
          t.boughtOn,
          t.priceMinor !== null ? toMajor(t.priceMinor, currency) : null,
          t.expiresOn,
          t.expiresOn ? t.remindDays : null,
          t.note,
        ]),
      }
    },
  },
  {
    id: 'vehicle-log',
    log: 'home',
    label: 'Vehicle log',
    description: 'Fuel, service and odometer entries',
    dated: true,
    async build({ currency, range }) {
      const [logs, vehicles] = await Promise.all([listVehicleLogs(), listVehicles()])
      const name = new Map(vehicles.map((v) => [v.id, v.name]))
      const rows = logs.filter((l) => name.has(l.vehicleId) && inRange(l.at, range)).reverse()
      return {
        name: 'Vehicle log',
        columns: [
          { header: 'Date', type: 'datetime', width: 18 },
          { header: 'Vehicle', type: 'text', width: 14 },
          { header: 'Type', type: 'text', width: 10 },
          { header: 'Odometer (km)', type: 'decimal', width: 14 },
          { header: 'Fuel (L)', type: 'decimal', width: 9 },
          { header: 'Full tank', type: 'boolean', width: 9 },
          { header: `Cost (${currency})`, type: 'money', width: 13 },
          { header: `Per litre (${currency})`, type: 'money', width: 14 },
          { header: 'Note', type: 'text', width: 30 },
        ],
        rows: rows.map((l) => [
          l.at,
          name.get(l.vehicleId)!,
          VEHICLE_LOG_LABEL[l.kind],
          l.odometerKm,
          l.litres,
          l.kind === 'fuel' ? l.fullTank : null,
          l.costMinor !== null ? toMajor(l.costMinor, currency) : null,
          l.kind === 'fuel' && l.costMinor && l.litres
            ? round2(toMajor(l.costMinor, currency) / l.litres)
            : null,
          l.note,
        ]),
      }
    },
  },
  {
    id: 'care-log',
    log: 'home',
    label: 'Care log',
    description: 'Every time a care task was done',
    dated: true,
    async build({ range }) {
      const [logs, tasks] = await Promise.all([listCareLogs(), listCareTasks()])
      const task = new Map(tasks.map((t) => [t.id, t]))
      const groupLabel = (g: string) => CARE_GROUPS.find((c) => c.value === g)?.label ?? g
      const rows = logs.filter((l) => task.has(l.taskId) && inRange(l.doneAt, range)).reverse()
      return {
        name: 'Care log',
        columns: [
          { header: 'Done', type: 'datetime', width: 18 },
          { header: 'Task', type: 'text', width: 24 },
          { header: 'For', type: 'text', width: 8 },
          { header: 'Note', type: 'text', width: 30 },
        ],
        rows: rows.map((l) => {
          const t = task.get(l.taskId)!
          return [l.doneAt, t.name, groupLabel(t.group), l.note]
        }),
      }
    },
  },
  {
    id: 'care-tasks',
    log: 'home',
    label: 'Care tasks',
    description: 'Repeat jobs and when each is next due',
    dated: false,
    async build() {
      const tasks = await listCareTasks()
      const groupLabel = (g: string) => CARE_GROUPS.find((c) => c.value === g)?.label ?? g
      return {
        name: 'Care tasks',
        columns: [
          { header: 'Task', type: 'text', width: 24 },
          { header: 'For', type: 'text', width: 8 },
          { header: 'Every (days)', type: 'integer', width: 12 },
          { header: 'Last done', type: 'datetime', width: 18 },
          { header: 'Next due', type: 'day', width: 12 },
          { header: 'Note', type: 'text', width: 30 },
        ],
        rows: tasks.map((t) => [
          t.name,
          groupLabel(t.group),
          t.everyDays,
          t.lastDoneAt,
          careNextDue(t),
          t.note,
        ]),
      }
    },
  },
]
