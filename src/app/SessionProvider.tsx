import type { ReactNode } from 'react'
import type { SessionStore } from './session'
import { SessionContext } from './useSession'

export function SessionProvider({ store, children }: { store: SessionStore; children: ReactNode }) {
  return <SessionContext value={store}>{children}</SessionContext>
}
