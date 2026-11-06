import { useQueryClient } from '@tanstack/react-query'
import type { NewMovement } from '@/api/endpoints'
import type { Cents } from '@/domain/types'
import { BlockedError } from '@/features/blockedError'
import { refreshMoneyQueries } from '@/features/refreshMoneyQueries'
import { useSingleSubmitMutation } from '@/features/useSingleSubmitMutation'
import { useWalletApi } from '@/features/walletApi'
import { checkNewMovement } from './movementChecks'

export type CreateMovementInput = {
  readonly movement: NewMovement
  /** Available of the source account, from `useAccounts`; `'unknown'` blocks expenses. */
  readonly available: Cents | 'unknown'
}

/** Records an income or an expense; an expense above (or with unknown) available is never sent. */
export function useCreateMovement() {
  const api = useWalletApi()
  const queryClient = useQueryClient()
  return useSingleSubmitMutation({
    mutationFn: ({ movement, available }: CreateMovementInput) => {
      const check = checkNewMovement(movement, available)
      if (!check.ok) return Promise.reject(new BlockedError(check.problem))
      return api.createMovement(movement)
    },
    onSuccess: () => refreshMoneyQueries(queryClient),
  })
}
