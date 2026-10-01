import { createBrowserRouter } from 'react-router'

import { WelcomePage } from './pages/WelcomePage'

export const router = createBrowserRouter([{ path: '*', element: <WelcomePage /> }], {
  basename: '/lifelogs-web',
})
