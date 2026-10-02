import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

import { runDueRecurring } from './data/recurring'
import { startFolderBackup } from './lib/folderBackup'
import { listenForInstall } from './lib/install'
import { applyTheme, getPrefs } from './lib/prefs'
import { router } from './router'
import './index.css'

applyTheme(getPrefs())
listenForInstall()
// Bills and subscriptions due since the app was last open are added to Expenses on start and
// whenever the app comes back to the foreground (it may stay open across midnight).
void runDueRecurring()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void runDueRecurring()
})
void startFolderBackup()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
