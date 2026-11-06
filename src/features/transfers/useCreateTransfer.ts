import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { NewTransfer } from '@/api/endpoints'
import { ApiError, type ApiErrorKind } from '@/api/errors'
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

export const CREATE_TRANSFER_KEY = ['createTransfer'] as const

/**
 * 422: the screen shows the refreshed available. Network, or a server error (including a 201 whose
 * body cannot be trusted): the transfer may exist, so the screen shows whether it went through
 * before the user decides to retry.
 */
const REFETCHING_ERRORS: readonly ApiErrorKind[] = ['insufficientFunds', 'network', 'server']

function refreshAfterError(queryClient: QueryClient, error: Error): Promise<unknown> | undefined {
  if (error instanceof ApiError && REFETCHING_ERRORS.includes(error.kind)) return refreshMoneyQueries(queryClient)
  return undefined
}

/** Defence in depth: the form only builds drafts with valid amounts, but this is the last gate before the POST. */
function isValidAmount(amount: Cents): boolean {
  return Number.isSafeInteger(amount) && amount > 0
}

/**
 * Sends one transfer: the last debit check runs against the current available (double-spend
 * guard), repeated confirms are ignored while one is in flight (also after leaving and coming
 * back to the screen), and nothing is ever resent automatically.
 * Success and the refetching errors are reported only after balances and pending transfers are refetched.
 */
export function useCreateTransfer() {
  const api = useWalletApi()
  const queryClient = useQueryClient()
  return useSingleSubmitMutation({
    mutationKey: CREATE_TRANSFER_KEY,
    mutationFn: ({ transfer, available }: CreateTransferInput) => {
      if (!isValidAmount(transfer.amount)) return Promise.reject(new BlockedError('invalidAmount'))
      const debit = canDebit(transfer.amount, available)
      if (!debit.ok) return Promise.reject(new BlockedError(debit.reason))
      return api.createTransfer(transfer)
    },
    onSuccess: () => refreshMoneyQueries(queryClient),
    onError: (error) => refreshAfterError(queryClient, error),
  })
}
