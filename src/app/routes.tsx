import { Navigate, type RouteObject } from 'react-router'
import { HomePage } from '@/features/accounts/HomePage'
import { LoginPage } from '@/features/session/LoginPage'
import { RequireSession } from '@/features/session/RequireSession'
import { AppShell } from './AppShell'
import { MovementsPage, NewMovementPage, TransferPage } from './pages'

export const appRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/movimientos', element: <MovementsPage /> },
          { path: '/movimientos/nuevo', element: <NewMovementPage /> },
          { path: '/movimientos/:id', element: <MovementsPage /> },
          { path: '/transferir', element: <TransferPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
