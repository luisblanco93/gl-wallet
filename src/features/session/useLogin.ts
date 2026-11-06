import { BlockedError } from '@/features/blockedError'
import { useSingleSubmitMutation } from '@/features/useSingleSubmitMutation'
import { useWalletApi } from '@/features/walletApi'
import { validateCredentials, type Credentials } from './credentials'
import { useSession } from './useSession'

/**
 * Signs in and stores the session. Invalid fields never reach the API (the form shows
 * them first with `validateCredentials`); a 401 here means wrong credentials.
 */
export function useLogin() {
  const api = useWalletApi()
  const { signIn } = useSession()
  return useSingleSubmitMutation({
    mutationFn: ({ email, password }: Credentials) => {
      const valid = validateCredentials(email, password)
      if (!valid.ok) return Promise.reject(new BlockedError('invalidFields'))
      return api.login(valid.value.email, valid.value.password)
    },
    onSuccess: (session) => signIn(session),
  })
}
