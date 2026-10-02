import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'

import { AppShell } from './components/AppShell'
import { LogLayout } from './components/LogLayout'
import { LiftLayout } from './logs/lift/LiftLayout'
import { WeightPage } from './logs/lift/WeightPage'
import { LogsHubPage } from './pages/LogsHubPage'
import { RouteError } from './pages/RouteError'
import { AboutPage, NotFoundPage } from './pages/simple'
import { TodayPage } from './pages/TodayPage'

// Today, Logs, Lift › Weight and About load with the app; other screens load on first visit (the service
// worker caches them all, so this only speeds up the first start).
function page<T>(load: () => Promise<T>, pick: (module: T) => ComponentType) {
  return () => load().then((module) => ({ Component: pick(module) }))
}

const EXPENSE_TABS = [{ value: 'spending', label: 'Spending' }] as const

const sessionPage = page(
  () => import('./logs/lift/SessionPage'),
  (m) => m.SessionPage,
)

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      // Blank canvas for the moment a lazily loaded screen is fetched on first start.
      hydrateFallbackElement: <div className="min-h-svh bg-canvas" />,
      children: [
        {
          // A screen that crashes or fails to load keeps the menu and navigation around it.
          errorElement: <RouteError />,
          children: [
            { index: true, handle: { title: 'Today', ownHeading: true }, element: <TodayPage /> },
            { path: 'logs', handle: { title: 'Logs' }, element: <LogsHubPage /> },
            {
              path: 'logs/manage',
              handle: { title: 'Manage logs' },
              lazy: page(
                () => import('./pages/ManageLogsPage'),
                (m) => m.ManageLogsPage,
              ),
            },
            {
              path: 'lift',
              handle: { title: 'Lift', ownHeading: true },
              element: <LiftLayout />,
              children: [
                { index: true, element: <Navigate to="weight" replace /> },
                { path: 'weight', element: <WeightPage /> },
                {
                  path: 'workouts',
                  lazy: page(
                    () => import('./logs/lift/WorkoutsPage'),
                    (m) => m.WorkoutsPage,
                  ),
                },
                { path: 'workouts/session', lazy: sessionPage },
                { path: 'workouts/:id', lazy: sessionPage },
                {
                  path: 'stats',
                  lazy: page(
                    () => import('./logs/lift/StatsPage'),
                    (m) => m.StatsPage,
                  ),
                },
                {
                  path: 'photos',
                  lazy: page(
                    () => import('./logs/lift/photos/PhotosPage'),
                    (m) => m.PhotosPage,
                  ),
                },
                {
                  path: 'photos/compare',
                  lazy: page(
                    () => import('./logs/lift/photos/PhotoDetailPage'),
                    (m) => m.PhotoComparePage,
                  ),
                },
                {
                  path: 'photos/:id',
                  lazy: page(
                    () => import('./logs/lift/photos/PhotoDetailPage'),
                    (m) => m.PhotoDetailPage,
                  ),
                },
              ],
            },
            {
              path: 'expenses',
              handle: { title: 'Expenses', ownHeading: true },
              element: <LogLayout log="expenses" tabs={EXPENSE_TABS} />,
              children: [
                { index: true, element: <Navigate to="spending" replace /> },
                {
                  path: 'spending',
                  lazy: page(
                    () => import('./logs/expenses/SpendingPage'),
                    (m) => m.SpendingPage,
                  ),
                },
              ],
            },
            {
              path: 'timeline',
              handle: { title: 'Timeline' },
              lazy: page(
                () => import('./pages/TimelinePage'),
                (m) => m.TimelinePage,
              ),
            },
            {
              path: 'insights',
              handle: { title: 'Insights' },
              lazy: page(
                () => import('./pages/InsightsPage'),
                (m) => m.InsightsPage,
              ),
            },
            {
              path: 'settings',
              handle: { title: 'Settings' },
              lazy: page(
                () => import('./pages/SettingsPage'),
                (m) => m.SettingsPage,
              ),
            },
            {
              path: 'profile',
              handle: { title: 'Profile' },
              lazy: page(
                () => import('./pages/ProfilePage'),
                (m) => m.ProfilePage,
              ),
            },
            {
              path: 'backup',
              handle: { title: 'Backup & restore' },
              lazy: page(
                () => import('./pages/BackupPage'),
                (m) => m.BackupPage,
              ),
            },
            { path: 'about', handle: { title: 'About', ownHeading: true }, element: <AboutPage /> },
            { path: '*', handle: { title: 'Not found' }, element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ],
  { basename: '/lifelogs-web' },
)
