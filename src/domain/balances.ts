import type { Account, Cents, Movement } from './types'

/** Available or in-progress money that could not be computed (fail closed: debits are blocked). */
export type Unknown = 'unknown'

export type AccountFigures = {
  /** API balance: completed movements only. */
  readonly settled: Cents
  /** Sum of this account's outgoing transfers still `pending`. */
  readonly inProgress: Cents | Unknown
  /** `settled − inProgress`: what the user can spend now. */
  readonly available: Cents | Unknown
}

function isPendingOutgoingOf(accountId: string, movement: Movement): boolean {
  return (
    movement.accountId === accountId &&
    movement.type === 'transfer' &&
    movement.direction === 'out' &&
    movement.status === 'pending'
  )
}

/**
 * The API balance ignores pending transfers, so it allows double spending.
 * Available subtracts this account's pending outgoing transfers; pass `'unknown'`
 * when they could not be loaded.
 */
export function accountFigures(
  account: Pick<Account, 'id' | 'balance'>,
  pendingTransfers: readonly Movement[] | Unknown,
): AccountFigures {
  if (pendingTransfers === 'unknown') {
    return { settled: account.balance, inProgress: 'unknown', available: 'unknown' }
  }

  const inProgress = pendingTransfers
    .filter((movement) => isPendingOutgoingOf(account.id, movement))
    .reduce((sum, movement) => sum + movement.amount, 0)

  return { settled: account.balance, inProgress, available: account.balance - inProgress }
}
