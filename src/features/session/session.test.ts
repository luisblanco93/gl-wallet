import { describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, createSessionStore, type SessionStorageLike } from './session'

/** Opaque session value issued by the mock API at login. */
const DEMO_SESSION_ID = 'session-of-demo-user'

const SESSION = {
  token: DEMO_SESSION_ID,
  user: { id: 'user-1', email: 'demo@example.com', name: 'Demo' },
}

function memoryStorage(initial: Record<string, string> = {}): SessionStorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

function setup(storage = memoryStorage()) {
  const onSignOut = vi.fn()
  const store = createSessionStore(storage, { onSignOut })
  return { store, storage, onSignOut }
}

describe('createSessionStore', () => {
  it('starts signed out when nothing is stored', () => {
    const { store } = setup()
    expect(store.getState()).toEqual({ status: 'signedOut', reason: null })
    expect(store.getToken()).toBeNull()
  })

  it('restores a stored session (reload keeps the session)', () => {
    const { store } = setup(memoryStorage({ [SESSION_STORAGE_KEY]: JSON.stringify(SESSION) }))
    expect(store.getState()).toEqual({ status: 'signedIn', session: SESSION })
    expect(store.getToken()).toBe(SESSION.token)
  })

  it.each([
    ['corrupt JSON', '{not json'],
    ['a wrong shape', JSON.stringify({ token: 42, user: {} })],
    ['an empty token', JSON.stringify({ ...SESSION, token: '' })],
    ['a user without email', JSON.stringify({ ...SESSION, user: { id: 'user-1', name: 'Demo' } })],
  ])('treats %s as signed out and removes it', (_case, stored) => {
    const { store, storage } = setup(memoryStorage({ [SESSION_STORAGE_KEY]: stored }))
    expect(store.getState()).toEqual({ status: 'signedOut', reason: null })
    expect(storage.data.has(SESSION_STORAGE_KEY)).toBe(false)
  })

  it('signs in, persists the session and notifies subscribers', () => {
    const { store, storage } = setup()
    const listener = vi.fn()
    store.subscribe(listener)
    store.signIn(SESSION)
    expect(store.getState()).toEqual({ status: 'signedIn', session: SESSION })
    expect(JSON.parse(storage.data.get(SESSION_STORAGE_KEY) ?? 'null')).toEqual(SESSION)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('stops notifying after unsubscribing', () => {
    const { store } = setup()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.signIn(SESSION)
    expect(listener).not.toHaveBeenCalled()
  })

  it('logs out: clears the stored session, records why and clears cached data', () => {
    const { store, storage, onSignOut } = setup()
    store.signIn(SESSION)
    store.signOut('loggedOut')
    expect(store.getState()).toEqual({ status: 'signedOut', reason: 'loggedOut' })
    expect(storage.data.has(SESSION_STORAGE_KEY)).toBe(false)
    expect(store.getToken()).toBeNull()
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('ends the session only once when several 401s arrive', () => {
    const { store, onSignOut } = setup()
    store.signIn(SESSION)
    store.signOut('expired')
    store.signOut('expired')
    store.signOut('loggedOut')
    expect(store.getState()).toEqual({ status: 'signedOut', reason: 'expired' })
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('ignores sign-out when already signed out', () => {
    const { store, onSignOut } = setup()
    store.signOut('expired')
    expect(store.getState()).toEqual({ status: 'signedOut', reason: null })
    expect(onSignOut).not.toHaveBeenCalled()
  })

  it('keeps the session in memory when storage is unavailable', () => {
    const failing: SessionStorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
    }
    const { store } = setup(failing as ReturnType<typeof memoryStorage>)
    store.signIn(SESSION)
    expect(store.getToken()).toBe(SESSION.token)
  })
})
