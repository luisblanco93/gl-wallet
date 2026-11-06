import { Navigate, type RouteObject } from 'react-router'
import { HomePage, LoginPage, MovementsPage } from './pages'
import { RequireSession } from '@/features/session/RequireSession'

export const appRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/movements', element: <MovementsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
