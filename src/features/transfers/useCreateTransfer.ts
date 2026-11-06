import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { NewTransfer } from '@/api/endpoints'
import { ApiError } from '@/api/errors'
import type { Unknown } from '@/domain/balances'
import { canDebit } from '@/domain/funds'
import type { Cents } from '@/domain/types'
import { BlockedError } from '@/features/blockedError'
import { refreshMoneyQueries } from '@/features/refreshMoneyQueries'
import { useSingleSubmitMutation } from '@/features/useSingleSubmitMutation'
import { useWalletApi } from '@/features/walletApi'

export type CreateTransferInput = {
  readonly transfer: NewTransfer
  /** The source's available at confirm time, from `useAccounts`: it may have changed since the form was checked. */
  readonly available: Cents | Unknown
}

/**
 * 422: the screen shows the refreshed available. Network: the server may have created the transfer,
 * so the screen shows whether it went through before the user decides to retry.
 */
function refreshAfterError(queryClient: QueryClient, error: Error): Promise<unknown> | undefined {
  if (error instanceof ApiError && (error.kind === 'insufficientFunds' || error.kind === 'network')) {
    return refreshMoneyQueries(queryClient)
  }
  return undefined
}

/**
 * Sends one transfer: the last debit check runs against the current available (double-spend
 * guard), repeated confirms are ignored while in flight, and nothing is ever resent automatically.
 * Success and the refetching errors are reported only after balances and pending transfers are refetched.
 */
export function useCreateTransfer() {
  const api = useWalletApi()
  const queryClient = useQueryClient()
  return useSingleSubmitMutation({
    mutationFn: ({ transfer, available }: CreateTransferInput) => {
      const debit = canDebit(transfer.amount, available)
      if (!debit.ok) return Promise.reject(new BlockedError(debit.reason))
      return api.createTransfer(transfer)
    },
    onSuccess: () => refreshMoneyQueries(queryClient),
    onError: (error) => refreshAfterError(queryClient, error),
  })
}
