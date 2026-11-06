import { useQueryClient } from '@tanstack/react-query'
import type { NewAccount } from '@/api/endpoints'
import { BlockedError } from '@/features/blockedError'
import { refreshIfOutcomeUnknown, refreshMoneyQueries } from '@/features/refreshMoneyQueries'
import { useSingleSubmitMutation } from '@/features/useSingleSubmitMutation'
import { useWalletApi } from '@/features/walletApi'
import { validateNewAccount } from './newAccount'

/** Creates an account; a name outside 2–100 characters is rejected without calling the API. */
export function useCreateAccount() {
  const api = useWalletApi()
  const queryClient = useQueryClient()
  return useSingleSubmitMutation({
    mutationKey: ['createAccount'],
    mutationFn: (account: NewAccount) => {
      const valid = validateNewAccount(account)
      if (!valid.ok) return Promise.reject(new BlockedError(valid.error))
      return api.createAccount(valid.value)
    },
    onSuccess: () => refreshMoneyQueries(queryClient),
    onError: (error) => refreshIfOutcomeUnknown(queryClient, error),
  })
}
