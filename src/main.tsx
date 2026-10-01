import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

import { startFolderBackup } from './lib/folderBackup'
import { applyTheme, getPrefs } from './lib/prefs'
import { router } from './router'
import './index.css'

applyTheme(getPrefs())
void startFolderBackup()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
