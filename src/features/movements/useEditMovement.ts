import { useQueryClient } from '@tanstack/react-query'
import type { MovementEdit } from '@/api/endpoints'
import type { Movement } from '@/domain/types'
import { BlockedError } from '@/features/blockedError'
import { refreshMoneyQueries } from '@/features/refreshMoneyQueries'
import { useSingleSubmitMutation } from '@/features/useSingleSubmitMutation'
import { useWalletApi } from '@/features/walletApi'
import { checkMovementEdit } from './movementChecks'

export type EditMovementInput = { readonly movement: Movement; readonly edit: MovementEdit }

/** Changes the category and description of an income or expense; transfers are never sent. */
export function useEditMovement() {
  const api = useWalletApi()
  const queryClient = useQueryClient()
  return useSingleSubmitMutation({
    mutationKey: ['editMovement'],
    mutationFn: ({ movement, edit }: EditMovementInput) => {
      const check = checkMovementEdit(movement, edit)
      if (!check.ok) return Promise.reject(new BlockedError(check.problem))
      return api.updateMovement(movement.id, edit)
    },
    onSuccess: () => refreshMoneyQueries(queryClient),
  })
}
