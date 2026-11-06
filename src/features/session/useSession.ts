import { createContext, useContext, useSyncExternalStore } from 'react'
import type { SessionStore } from './session'

export const SessionContext = createContext<SessionStore | null>(null)

/** Current session state plus sign-in/out; re-renders when the store changes. */
export function useSession() {
  const store = useContext(SessionContext)
  if (!store) throw new Error('useSession must be used inside SessionProvider')
  const state = useSyncExternalStore(store.subscribe, store.getState)
  return { state, signIn: store.signIn, signOut: store.signOut }
}
