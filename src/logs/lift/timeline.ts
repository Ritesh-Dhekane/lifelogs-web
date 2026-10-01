// Lift's entries for the shared timeline: weigh-ins and finished workouts.

import { MUSCLE_LABEL } from '../../data/exercises'
import { listWeights } from '../../data/repos'
import { listWorkouts } from '../../data/workouts'
import { getPrefs } from '../../lib/prefs'
import { formatMass, formatWeight } from '../../lib/units'
import type { TimelineItem } from '../timeline'
import { KIND_LABEL } from './labels'
import { formatMinutes, musclesWorked, summarize } from './workoutStats'

export async function liftTimeline(): Promise<TimelineItem[]> {
  const unit = getPrefs().units.weight
  const [weights, workouts] = await Promise.all([listWeights(), listWorkouts()])

  const weighIns: TimelineItem[] = weights.map((entry) => ({
    id: `weight-${entry.id}`,
    log: 'lift',
    at: entry.recordedAt,
    title: formatWeight(entry.weightKg, unit),
    detail: KIND_LABEL[entry.kind],
    quote: entry.note ?? undefined,
    to: '/lift/weight',
    searchText: ['weight', KIND_LABEL[entry.kind], entry.note ?? ''].join(' ').toLowerCase(),
  }))

  const sessions: TimelineItem[] = workouts.map((detail) => {
    const summary = summarize(detail)
    const muscles = musclesWorked(detail).map((m) => MUSCLE_LABEL[m])
    const name = detail.workout.name ?? (muscles.slice(0, 2).join(' & ') || 'Workout')
    const exercises = detail.exercises.map((e) => e.exercise.name)
    return {
      id: `workout-${detail.workout.id}`,
      log: 'lift',
      at: detail.workout.startedAt,
      title: name,
      detail: `${formatMinutes(summary.durationMs)} · ${summary.sets} sets · ${formatMass(summary.volumeKg, unit)}`,
      quote: detail.workout.note ?? undefined,
      to: `/lift/workouts/${detail.workout.id}`,
      searchText: ['workout', name, ...muscles, ...exercises, detail.workout.note ?? '']
        .join(' ')
        .toLowerCase(),
    }
  })

  return [...weighIns, ...sessions]
}
