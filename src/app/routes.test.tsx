import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { appRoutes } from './routes'
import { createSessionStore, type SessionStorageLike } from './session'
import { SessionProvider } from './SessionProvider'

/** Opaque session value issued by the mock API at login. */
const DEMO_SESSION_ID = 'session-of-demo-user'
const SESSION = { token: DEMO_SESSION_ID, user: { id: 'user-1', email: 'demo@example.com', name: 'Demo' } }

function memoryStorage(): SessionStorageLike {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

function renderAt(path: string, { signedIn = false } = {}) {
  const onSignOut = vi.fn()
  const store = createSessionStore(memoryStorage(), { onSignOut })
  if (signedIn) store.signIn(SESSION)
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <SessionProvider store={store}>
      <RouterProvider router={router} />
    </SessionProvider>,
  )
  return { store, router, onSignOut }
}

describe('app routes', () => {
  it('redirects a signed-out user from movements to login', () => {
    const { router } = renderAt('/movements')
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('redirects a signed-out user from home to login', () => {
    const { router } = renderAt('/')
    expect(router.state.location.pathname).toBe('/login')
  })

  it('shows protected screens to a signed-in user', () => {
    renderAt('/movements', { signedIn: true })
    expect(screen.getByRole('heading', { name: 'Movimientos' })).toBeInTheDocument()
  })

  it('sends a signed-in user away from login to home', () => {
    const { router } = renderAt('/login', { signedIn: true })
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  })

  it('sends unknown routes to home', () => {
    const { router } = renderAt('/does-not-exist', { signedIn: true })
    expect(router.state.location.pathname).toBe('/')
  })

  it('shows the session-ended message when the session expires', async () => {
    const { store, router } = renderAt('/movements', { signedIn: true })
    store.signOut('expired')
    expect(await screen.findByText('Tu sesión terminó. Vuelve a iniciar sesión.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('logs out to the login screen without the session-ended message, clearing cached data', async () => {
    const { onSignOut } = renderAt('/', { signedIn: true })
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Tu sesión terminó. Vuelve a iniciar sesión.')).not.toBeInTheDocument()
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
