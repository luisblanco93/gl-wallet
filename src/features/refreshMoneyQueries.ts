import type { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'
import { ACCOUNTS_KEY, PENDING_TRANSFERS_KEY } from '@/features/accounts/useAccounts'
import { MOVEMENTS_KEY } from '@/features/movements/useMovements'

/** After any mutation, balances, availability and the movement list are refetched. */
export function refreshMoneyQueries(queryClient: QueryClient): Promise<unknown> {
  return Promise.all(
    [ACCOUNTS_KEY, PENDING_TRANSFERS_KEY, MOVEMENTS_KEY].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}

/**
 * After a network failure the server may have recorded the operation anyway: refetch so the
 * screen shows whether it went through before the user tries again (mutations never retry).
 */
export function refreshIfOutcomeUnknown(queryClient: QueryClient, error: Error): void {
  if (error instanceof ApiError && error.kind === 'network') void refreshMoneyQueries(queryClient)
}
