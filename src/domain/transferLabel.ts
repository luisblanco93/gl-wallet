import type { Account, Movement } from './types'

/**
 * "Transferencia a …" (outgoing) or "Transferencia desde …" (incoming). The counterpart
 * is the account name when it is one of the user's accounts, the raw id otherwise.
 */
export function transferLabel(
  movement: Pick<Movement, 'direction' | 'counterpartAccountId'>,
  ownAccounts: readonly Pick<Account, 'id' | 'name'>[],
): string {
  const { direction, counterpartAccountId } = movement
  if (direction === null || counterpartAccountId === null) return 'Transferencia'

  const counterpart = ownAccounts.find((account) => account.id === counterpartAccountId)?.name ?? counterpartAccountId
  return direction === 'out' ? `Transferencia a ${counterpart}` : `Transferencia desde ${counterpart}`
}
