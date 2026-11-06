import { useQuery } from '@tanstack/react-query'
import { accountFigures, type AccountFigures } from '@/domain/balances'
import type { Account } from '@/domain/types'
import { useWalletApi } from '@/features/walletApi'

export type AccountView = Account & AccountFigures

/** State of the pending-transfers request. Only `ready` yields a known available. */
export type PendingStatus = 'loading' | 'error' | 'ready'

export type AccountsResult =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: unknown; readonly retry: () => void }
  | {
      readonly status: 'ready'
      readonly accounts: readonly AccountView[]
      readonly pending: PendingStatus
      readonly retryPending: () => void
    }

export const ACCOUNTS_KEY = ['accounts'] as const
export const PENDING_TRANSFERS_KEY = ['pendingTransfers'] as const

/**
 * Accounts with settled, in-progress and available figures. Until pending transfers are
 * known (loading or failed), available is `'unknown'`, so `canDebit` blocks every debit.
 */
export function useAccounts(): AccountsResult {
  const api = useWalletApi()
  const accounts = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: () => api.listAccounts() })
  const pending = useQuery({ queryKey: PENDING_TRANSFERS_KEY, queryFn: () => api.listPendingTransfers() })

  if (accounts.isPending) return { status: 'loading' }
  if (accounts.isError) return { status: 'error', error: accounts.error, retry: () => void accounts.refetch() }

  const pendingStatus: PendingStatus = pending.isSuccess ? 'ready' : pending.isError ? 'error' : 'loading'
  const pendingTransfers = pending.isSuccess ? pending.data : 'unknown'

  return {
    status: 'ready',
    accounts: accounts.data.map((account) => ({ ...account, ...accountFigures(account, pendingTransfers) })),
    pending: pendingStatus,
    retryPending: () => void pending.refetch(),
  }
}
