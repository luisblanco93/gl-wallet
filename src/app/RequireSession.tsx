import { Navigate, Outlet } from 'react-router'
import { useSession } from './useSession'

/** Every screen except login requires a session; an ended session sends the user to login. */
export function RequireSession() {
  const { state } = useSession()
  if (state.status === 'signedOut') return <Navigate to="/login" replace />
  return <Outlet />
}
