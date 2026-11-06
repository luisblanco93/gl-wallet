import type { QueryClient } from '@tanstack/react-query'
import { createApiClient } from '@/api/client'
import { createWalletApi, type WalletApi } from '@/api/endpoints'
import { createQueryClient } from './queryClient'
import { createSessionStore, type SessionStorageLike, type SessionStore } from './session'

export type AppServices = {
  readonly queryClient: QueryClient
  readonly sessionStore: SessionStore
  readonly walletApi: WalletApi
}

/**
 * Wires the session into the API client: requests carry the stored token, and a 401 on an
 * authenticated request ends the session as expired, which clears every cached query.
 */
export function createAppServices(options: {
  readonly apiUrl: string
  readonly fetch: typeof globalThis.fetch
  readonly storage: SessionStorageLike
}): AppServices {
  const queryClient = createQueryClient()
  const sessionStore = createSessionStore(options.storage, { onSignOut: () => queryClient.clear() })
  const client = createApiClient({
    baseUrl: options.apiUrl,
    fetch: options.fetch,
    getToken: sessionStore.getToken,
    onUnauthorized: () => sessionStore.signOut('expired'),
  })
  return { queryClient, sessionStore, walletApi: createWalletApi(client) }
}
