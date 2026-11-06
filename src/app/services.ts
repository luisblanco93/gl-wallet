import type { QueryClient } from '@tanstack/react-query'
import { createApiClient } from '@/api/client'
import { createWalletApi } from '@/api/endpoints'
import { createFxApi } from '@/api/fx'
import { createQueryClient } from './queryClient'
import { createSessionStore, type SessionStorageLike, type SessionStore } from '@/features/session/session'
import type { AppApi } from '@/features/walletApi'

export type AppServices = {
  readonly queryClient: QueryClient
  readonly sessionStore: SessionStore
  readonly walletApi: AppApi
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
  // The FX source gets the plain `fetch`: no wallet token, no 401 handling.
  return { queryClient, sessionStore, walletApi: { ...createWalletApi(client), ...createFxApi(options.fetch) } }
}
