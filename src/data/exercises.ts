// Built-in exercise library, added to the database on first run. IDs are stable ("bi-…") so
// backups from different devices agree on them. People can add their own on top.

import type { Equipment, Exercise, MuscleGroup } from './db'

type Seed = Pick<Exercise, 'id' | 'name' | 'muscle' | 'equipment'>

const list: [string, MuscleGroup, Equipment][] = [
  // Chest
  ['Barbell Bench Press', 'chest', 'barbell'],
  ['Incline Barbell Bench Press', 'chest', 'barbell'],
  ['Decline Barbell Bench Press', 'chest', 'barbell'],
  ['Dumbbell Bench Press', 'chest', 'dumbbell'],
  ['Incline Dumbbell Press', 'chest', 'dumbbell'],
  ['Dumbbell Flyes', 'chest', 'dumbbell'],
  ['Cable Crossover', 'chest', 'cable'],
  ['Chest Press Machine', 'chest', 'machine'],
  ['Pec Deck', 'chest', 'machine'],
  ['Push-ups', 'chest', 'bodyweight'],
  ['Chest Dips', 'chest', 'bodyweight'],
  // Back
  ['Deadlift', 'back', 'barbell'],
  ['Barbell Row', 'back', 'barbell'],
  ['T-Bar Row', 'back', 'barbell'],
  ['Dumbbell Row', 'back', 'dumbbell'],
  ['Lat Pulldown', 'back', 'cable'],
  ['Seated Cable Row', 'back', 'cable'],
  ['Straight-Arm Pulldown', 'back', 'cable'],
  ['Pull-ups', 'back', 'bodyweight'],
  ['Chin-ups', 'back', 'bodyweight'],
  ['Back Extension', 'back', 'bodyweight'],
  // Legs
  ['Barbell Back Squat', 'legs', 'barbell'],
  ['Front Squat', 'legs', 'barbell'],
  ['Romanian Deadlift', 'legs', 'barbell'],
  ['Hip Thrust', 'legs', 'barbell'],
  ['Bulgarian Split Squat', 'legs', 'dumbbell'],
  ['Walking Lunges', 'legs', 'dumbbell'],
  ['Goblet Squat', 'legs', 'dumbbell'],
  ['Leg Press', 'legs', 'machine'],
  ['Leg Extension', 'legs', 'machine'],
  ['Leg Curl', 'legs', 'machine'],
  ['Hack Squat', 'legs', 'machine'],
  ['Standing Calf Raise', 'legs', 'machine'],
  ['Seated Calf Raise', 'legs', 'machine'],
  // Shoulders
  ['Overhead Press', 'shoulders', 'barbell'],
  ['Seated Dumbbell Press', 'shoulders', 'dumbbell'],
  ['Arnold Press', 'shoulders', 'dumbbell'],
  ['Lateral Raise', 'shoulders', 'dumbbell'],
  ['Front Raise', 'shoulders', 'dumbbell'],
  ['Rear Delt Fly', 'shoulders', 'dumbbell'],
  ['Cable Lateral Raise', 'shoulders', 'cable'],
  ['Face Pull', 'shoulders', 'cable'],
  ['Shoulder Press Machine', 'shoulders', 'machine'],
  ['Shrugs', 'shoulders', 'dumbbell'],
  // Arms
  ['Barbell Curl', 'arms', 'barbell'],
  ['Dumbbell Curl', 'arms', 'dumbbell'],
  ['Hammer Curl', 'arms', 'dumbbell'],
  ['Incline Dumbbell Curl', 'arms', 'dumbbell'],
  ['Preacher Curl', 'arms', 'machine'],
  ['Cable Curl', 'arms', 'cable'],
  ['Tricep Rope Pushdown', 'arms', 'cable'],
  ['Overhead Tricep Extension', 'arms', 'cable'],
  ['Skull Crushers', 'arms', 'barbell'],
  ['Close-Grip Bench Press', 'arms', 'barbell'],
  ['Tricep Dips', 'arms', 'bodyweight'],
  // Core
  ['Plank', 'core', 'bodyweight'],
  ['Hanging Leg Raise', 'core', 'bodyweight'],
  ['Crunches', 'core', 'bodyweight'],
  ['Cable Crunch', 'core', 'cable'],
  ['Russian Twist', 'core', 'bodyweight'],
  ['Ab Wheel Rollout', 'core', 'other'],
]

export const BUILT_IN_EXERCISES: Seed[] = list.map(([name, muscle, equipment]) => ({
  id: `bi-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`,
  name,
  muscle,
  equipment,
}))

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  other: 'Other',
}
