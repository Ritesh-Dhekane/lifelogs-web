import { createBrowserRouter, Navigate } from 'react-router'

import { AppShell } from './components/AppShell'
import { LiftLayout } from './logs/lift/LiftLayout'
import { SessionPage } from './logs/lift/SessionPage'
import { StatsPage } from './logs/lift/StatsPage'
import { WeightPage } from './logs/lift/WeightPage'
import { WorkoutsPage } from './logs/lift/WorkoutsPage'
import { LogsHubPage } from './pages/LogsHubPage'
import { SettingsPage } from './pages/SettingsPage'
import { AboutPage, NotFoundPage, Planned } from './pages/simple'

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        {
          index: true,
          handle: { title: 'Today' },
          element: (
            <Planned title="Today" text="Your daily summary arrives with the Lift screens." />
          ),
        },
        { path: 'logs', handle: { title: 'Logs' }, element: <LogsHubPage /> },
        {
          path: 'logs/manage',
          handle: { title: 'Manage logs' },
          element: <Planned title="Manage logs" text="Reorder your logs here soon." />,
        },
        {
          path: 'lift',
          handle: { title: 'Lift' },
          element: <LiftLayout />,
          children: [
            { index: true, element: <Navigate to="weight" replace /> },
            { path: 'weight', element: <WeightPage /> },
            { path: 'workouts', element: <WorkoutsPage /> },
            { path: 'workouts/session', element: <SessionPage /> },
            { path: 'workouts/:id', element: <SessionPage /> },
            { path: 'stats', element: <StatsPage /> },
            { path: 'photos', element: <Planned title="Progress photos" text="Coming soon." /> },
          ],
        },
        {
          path: 'timeline',
          handle: { title: 'Timeline' },
          element: <Planned title="Timeline" text="Everything you log, day by day." />,
        },
        {
          path: 'insights',
          handle: { title: 'Insights' },
          element: <Planned title="Insights" text="Your week at a glance." />,
        },
        { path: 'settings', handle: { title: 'Settings' }, element: <SettingsPage /> },
        {
          path: 'profile',
          handle: { title: 'Profile' },
          element: <Planned title="Profile" text="Height, goal and target weight." />,
        },
        {
          path: 'backup',
          handle: { title: 'Backup & restore' },
          element: (
            <Planned title="Backup & restore" text="Export to a file or back up to Google Drive." />
          ),
        },
        { path: 'about', handle: { title: 'About' }, element: <AboutPage /> },
        { path: '*', handle: { title: 'Not found' }, element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/lifelogs-web' },
)
