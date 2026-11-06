import { useOutletContext } from 'react-router'
import type { OwnAccount } from './movementView'

/** What the movements page gives its detail route: account names and how to close it. */
export type MovementDetailContext = {
  readonly ownAccounts: readonly OwnAccount[]
  /** Goes back to the list (keeping its filters) and returns focus to the movement's row. */
  readonly close: (id: string) => void
}

export function useMovementDetailContext(): MovementDetailContext {
  return useOutletContext<MovementDetailContext>()
}
