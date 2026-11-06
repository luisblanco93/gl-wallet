import type { Session } from '@/api/endpoints'

export type SessionEndReason = 'loggedOut' | 'expired'

export type SessionState =
  | { readonly status: 'signedIn'; readonly session: Session }
  | { readonly status: 'signedOut'; readonly reason: SessionEndReason | null }

export type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type SessionStore = {
  getState(): SessionState
  subscribe(listener: () => void): () => void
  /** Read by the API client on every request. */
  getToken(): string | null
  signIn(session: Session): void
  /** Idempotent: several requests can return 401 at once; only the first sign-out counts. */
  signOut(reason: SessionEndReason): void
}

export const SESSION_STORAGE_KEY = 'wallet.session'

const NEVER_SIGNED_IN: SessionState = { status: 'signedOut', reason: null }

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const { token, user } = value as Record<string, unknown>
  if (!isString(token) || token === '' || typeof user !== 'object' || user === null) return false
  const { id, email, name } = user as Record<string, unknown>
  return isString(id) && isString(email) && isString(name)
}

/** A missing, corrupt or wrong-shaped value means signed out; a bad value is removed. */
function readStoredSession(storage: SessionStorageLike): Session | null {
  const raw = storage.getItem(SESSION_STORAGE_KEY)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isSession(parsed)) return { token: parsed.token, user: { ...parsed.user } }
  } catch {
    // Corrupt JSON: handled below like any wrong shape.
  }
  storage.removeItem(SESSION_STORAGE_KEY)
  return null
}

/** Storage can be unavailable (privacy mode, quota); the session then lives in memory only. */
function tryStorage(action: () => void): void {
  try {
    action()
  } catch {
    // Not fatal: the session still works until the tab closes.
  }
}

/**
 * Session state outside React, persisted in `sessionStorage` so it survives a reload
 * and ends with the tab. `onSignOut` clears every cached query.
 */
export function createSessionStore(
  storage: SessionStorageLike,
  options: { readonly onSignOut: () => void },
): SessionStore {
  const stored = readStoredSession(storage)
  let state: SessionState = stored ? { status: 'signedIn', session: stored } : NEVER_SIGNED_IN
  const listeners = new Set<() => void>()

  function setState(next: SessionState): void {
    state = next
    listeners.forEach((listener) => listener())
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    getToken: () => (state.status === 'signedIn' ? state.session.token : null),

    signIn(session) {
      tryStorage(() => storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)))
      setState({ status: 'signedIn', session })
    },

    signOut(reason) {
      if (state.status === 'signedOut') return
      tryStorage(() => storage.removeItem(SESSION_STORAGE_KEY))
      setState({ status: 'signedOut', reason })
      options.onSignOut()
    },
  }
}
