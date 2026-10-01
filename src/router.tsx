import { createBrowserRouter, Navigate } from 'react-router'

import { AppShell } from './components/AppShell'
import { LiftLayout } from './logs/lift/LiftLayout'
import { SessionPage } from './logs/lift/SessionPage'
import { StatsPage } from './logs/lift/StatsPage'
import { WeightPage } from './logs/lift/WeightPage'
import { WorkoutsPage } from './logs/lift/WorkoutsPage'
import { LogsHubPage } from './pages/LogsHubPage'
import { BackupPage } from './pages/BackupPage'
import { InsightsPage } from './pages/InsightsPage'
import { ManageLogsPage } from './pages/ManageLogsPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { TimelinePage } from './pages/TimelinePage'
import { TodayPage } from './pages/TodayPage'
import { AboutPage, NotFoundPage, Planned } from './pages/simple'

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        {
          index: true,
          handle: { title: 'Today' },
          element: <TodayPage />,
        },
        { path: 'logs', handle: { title: 'Logs' }, element: <LogsHubPage /> },
        {
          path: 'logs/manage',
          handle: { title: 'Manage logs' },
          element: <ManageLogsPage />,
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
          element: <TimelinePage />,
        },
        {
          path: 'insights',
          handle: { title: 'Insights' },
          element: <InsightsPage />,
        },
        { path: 'settings', handle: { title: 'Settings' }, element: <SettingsPage /> },
        {
          path: 'profile',
          handle: { title: 'Profile' },
          element: <ProfilePage />,
        },
        {
          path: 'backup',
          handle: { title: 'Backup & restore' },
          element: <BackupPage />,
        },
        { path: 'about', handle: { title: 'About' }, element: <AboutPage /> },
        { path: '*', handle: { title: 'Not found' }, element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/lifelogs-web' },
)
