// Test-only helpers: a fake API, a fresh query client and the providers hooks need.
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import type { Session, WalletApi } from '@/api/endpoints'
import { createQueryClient } from '@/app/queryClient'
import { createSessionStore, type SessionStorageLike, type SessionStore } from '@/features/session/session'
import { SessionProvider } from '@/features/session/SessionProvider'
import { ToastProvider } from '@/features/toast/ToastProvider'
import { WalletApiContext } from '@/features/walletApi'

/** Opaque session value issued by the mock API at login. */
const DEMO_SESSION_ID = 'session-of-demo-user'

export const DEMO_SESSION: Session = {
  token: DEMO_SESSION_ID,
  user: { id: 'user-1', email: 'demo@example.com', name: 'Demo' },
}

type FakeApi = { [K in keyof WalletApi]: ReturnType<typeof vi.fn<WalletApi[K]>> }

/** Every method fails loudly unless the test stubs it. */
export function createFakeApi(): FakeApi {
  const notStubbed = (name: string) => () => Promise.reject(new Error(`${name} was not stubbed`))
  return {
    login: vi.fn<WalletApi['login']>(notStubbed('login')),
    listAccounts: vi.fn<WalletApi['listAccounts']>(notStubbed('listAccounts')),
    createAccount: vi.fn<WalletApi['createAccount']>(notStubbed('createAccount')),
    listMovements: vi.fn<WalletApi['listMovements']>(notStubbed('listMovements')),
    listPendingTransfers: vi.fn<WalletApi['listPendingTransfers']>(notStubbed('listPendingTransfers')),
    createMovement: vi.fn<WalletApi['createMovement']>(notStubbed('createMovement')),
    updateMovement: vi.fn<WalletApi['updateMovement']>(notStubbed('updateMovement')),
  }
}

/** The production policy, without the retry delay. */
export function createTestQueryClient(): QueryClient {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  })
  return queryClient
}

function memoryStorage(): SessionStorageLike {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

export type TestProviders = {
  readonly api: FakeApi
  readonly queryClient: QueryClient
  readonly sessionStore: SessionStore
  /** Every app provider plus a memory router at `initialPath`. */
  readonly wrapper: (props: { children: ReactNode }) => ReactNode
  /** Every app provider, without a router (for tests that build their own). */
  readonly Providers: (props: { children: ReactNode }) => ReactNode
}

export function createTestProviders(options: { signedIn?: boolean; initialPath?: string } = {}): TestProviders {
  const { signedIn = true, initialPath = '/' } = options
  const api = createFakeApi()
  const queryClient = createTestQueryClient()
  const sessionStore = createSessionStore(memoryStorage(), { onSignOut: () => queryClient.clear() })
  if (signedIn) sessionStore.signIn(DEMO_SESSION)

  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SessionProvider store={sessionStore}>
          <WalletApiContext value={api}>
            <ToastProvider>{children}</ToastProvider>
          </WalletApiContext>
        </SessionProvider>
      </QueryClientProvider>
    )
  }

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <Providers>
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </Providers>
    )
  }

  return { api, queryClient, sessionStore, wrapper, Providers }
}
