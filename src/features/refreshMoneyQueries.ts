import type { QueryClient } from '@tanstack/react-query'
import { ACCOUNTS_KEY, PENDING_TRANSFERS_KEY } from '@/features/accounts/useAccounts'
import { MOVEMENTS_KEY } from '@/features/movements/useMovements'

/** After any mutation, balances, availability and the movement list are refetched. */
export function refreshMoneyQueries(queryClient: QueryClient): Promise<unknown> {
  return Promise.all(
    [ACCOUNTS_KEY, PENDING_TRANSFERS_KEY, MOVEMENTS_KEY].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}
