// Home's section on the Insights screen for one week: care done, driving and what's coming up.

import { useLiveQuery } from 'dexie-react-hooks'

import { Card, LogBadge } from '../../components/ui'
import { listCareLogs, listCareTasks } from '../../data/care'
import { listVehicleLogs } from '../../data/vehicles'
import { addDays, toDay } from '../../lib/days'
import { formatMoney } from '../../lib/money'
import { usePrefs } from '../../lib/prefs'
import { getLog } from '../registry'
import { useDue } from './useDue'

async function load() {
  const [careLogs, careTasks, vehicleLogs] = await Promise.all([
    listCareLogs(),
    listCareTasks(),
    listVehicleLogs(),
  ])
  return { careLogs, careTasks, vehicleLogs }
}

export function HomeInsights({ from, to, now }: { from: Date; to: Date; now: Date }) {
  const data = useLiveQuery(load)
  const { currency } = usePrefs()
  const today = toDay(now)
  const due = useDue(today)
  const log = getLog('home')
  if (!data || !due) return null

  const inWeek = (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= from.getTime() && t < to.getTime()
  }
  const live = new Set(data.careTasks.map((t) => t.id))
  const careDone = data.careLogs.filter((l) => live.has(l.taskId) && inWeek(l.doneAt))
  const fills = data.vehicleLogs.filter((l) => l.kind === 'fuel' && inWeek(l.at))
  const fuelCost = fills.reduce((s, l) => s + (l.costMinor ?? 0), 0)
  const litres = fills.reduce((s, l) => s + (l.litres ?? 0), 0)
  const isCurrent = to.getTime() > now.getTime()
  const nextWeek = addDays(today, 7)
  const coming = due.items.filter((i) => !i.overdue && i.day <= nextWeek).length
  const overdue = due.items.filter((i) => i.overdue).length

  if (due.empty && careDone.length === 0 && fills.length === 0) return null

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <LogBadge icon={log.icon} colorClass={log.color.text} softClass={log.color.soft} />
        <div>
          <h2 className="text-heading">Home</h2>
          <p className="text-label text-ink-2">
            {careDone.length} care {careDone.length === 1 ? 'task' : 'tasks'} done
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card-2 p-3">
          <p className="text-label text-ink-2">Fuel</p>
          <p className="text-heading tnum">
            {fills.length ? formatMoney(fuelCost, currency) : '—'}
          </p>
          <p className="text-label text-ink-2 tnum">
            {fills.length
              ? `${Math.round(litres * 10) / 10} L in ${fills.length} ${fills.length === 1 ? 'fill' : 'fills'}`
              : 'No fills'}
          </p>
        </div>
        <div className="rounded-xl bg-card-2 p-3">
          <p className="text-label text-ink-2">{isCurrent ? 'Coming up' : 'Now'}</p>
          <p className="text-heading tnum">{coming} due</p>
          <p className={`text-label ${overdue ? 'font-medium text-danger' : 'text-ink-2'}`}>
            {overdue ? `${overdue} overdue` : 'in the next 7 days'}
          </p>
        </div>
      </div>
    </Card>
  )
}
