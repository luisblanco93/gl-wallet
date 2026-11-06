import { Navigate, type RouteObject } from 'react-router'
import { HomePage } from '@/features/accounts/HomePage'
import { LoginPage } from '@/features/session/LoginPage'
import { MovementDetail } from '@/features/movements/MovementDetail'
import { MovementsPage } from '@/features/movements/MovementsPage'
import { NewMovementPage } from '@/features/movements/NewMovementPage'
import { RequireSession } from '@/features/session/RequireSession'
import { AppShell } from './AppShell'
import { TransferPage } from './pages'

export const appRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <HomePage /> },
          {
            // The detail is a child route, so the list stays mounted (search, scroll, focus) under it.
            path: '/movimientos',
            element: <MovementsPage />,
            children: [{ path: ':id', element: <MovementDetail /> }],
          },
          { path: '/movimientos/nuevo', element: <NewMovementPage /> },
          { path: '/transferir', element: <TransferPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
