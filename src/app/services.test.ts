import { describe, expect, it, vi } from 'vitest'
import { createAppServices } from './services'
import type { SessionStorageLike } from './session'

/** Opaque session value issued by the mock API at login. */
const DEMO_SESSION_ID = 'session-of-demo-user'

const SESSION = {
  token: DEMO_SESSION_ID,
  user: { id: 'user-1', email: 'demo@example.com', name: 'Demo' },
}

function memoryStorage(): SessionStorageLike {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

function unauthorized(): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('createAppServices', () => {
  it('ends the session as expired and clears cached data when an authenticated request gets a 401', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(unauthorized)
    const { sessionStore, queryClient, walletApi } = createAppServices({
      apiUrl: 'http://api.test',
      fetch,
      storage: memoryStorage(),
    })
    sessionStore.signIn(SESSION)
    queryClient.setQueryData(['accounts'], [{ id: 'acc-1' }])

    await expect(walletApi.listAccounts()).rejects.toMatchObject({ kind: 'unauthorized' })

    expect(sessionStore.getState()).toEqual({ status: 'signedOut', reason: 'expired' })
    expect(queryClient.getQueryData(['accounts'])).toBeUndefined()
  })

  it('keeps a wrong-credentials login from looking like an expired session', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(unauthorized)
    const { sessionStore, walletApi } = createAppServices({ apiUrl: 'http://api.test', fetch, storage: memoryStorage() })

    await expect(walletApi.login('demo@example.com', 'wrong')).rejects.toMatchObject({ kind: 'unauthorized' })

    expect(sessionStore.getState()).toEqual({ status: 'signedOut', reason: null })
  })

  it('sends the stored token to the API', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ accounts: [] }), { headers: { 'Content-Type': 'application/json' } }),
      ),
    )
    const { sessionStore, walletApi } = createAppServices({ apiUrl: 'http://api.test', fetch, storage: memoryStorage() })
    sessionStore.signIn(SESSION)

    await walletApi.listAccounts()

    const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers)
    expect(headers.get('Authorization')).toBe(`Bearer ${SESSION.token}`)
  })
})
