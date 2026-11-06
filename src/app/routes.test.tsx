import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createTestProviders } from '@/test/providers'
import { appRoutes } from './routes'

const never = <T,>() => new Promise<T>(() => {})

function renderAt(path: string, { signedIn = false } = {}) {
  const providers = createTestProviders({ signedIn })
  providers.api.listAccounts.mockImplementation(never)
  providers.api.listPendingTransfers.mockImplementation(never)
  providers.api.listMovements.mockImplementation(never)
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <providers.Providers>
      <RouterProvider router={router} />
    </providers.Providers>,
  )
  return { ...providers, router }
}

describe('app routes', () => {
  it('redirects a signed-out user from movements to login', () => {
    const { router } = renderAt('/movimientos')
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('redirects a signed-out user from home to login', () => {
    const { router } = renderAt('/')
    expect(router.state.location.pathname).toBe('/login')
  })

  it('shows protected screens inside the app shell to a signed-in user', () => {
    renderAt('/movimientos', { signedIn: true })
    expect(screen.getByRole('heading', { level: 1, name: 'Movimientos' })).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Principal' })[0]
    expect(nav).toBeDefined()
    expect(screen.getAllByRole('link', { name: /Movimientos/ })[0]).toHaveAttribute('aria-current', 'page')
  })

  it('sends a signed-in user away from login to home', () => {
    const { router } = renderAt('/login', { signedIn: true })
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Tu dinero' })).toBeInTheDocument()
  })

  it('sends unknown routes to home', () => {
    const { router } = renderAt('/does-not-exist', { signedIn: true })
    expect(router.state.location.pathname).toBe('/')
  })

  it('warns that the session expired when an authenticated request is rejected', async () => {
    const { sessionStore, router } = renderAt('/movimientos', { signedIn: true })
    sessionStore.signOut('expired')
    expect(await screen.findByText('Tu sesión venció')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('logs out to the login screen without the expired warning', async () => {
    const { queryClient } = renderAt('/', { signedIn: true })
    queryClient.setQueryData(['accounts'], [])
    await userEvent.click(screen.getAllByRole('button', { name: 'Cerrar sesión' })[0] as HTMLElement)
    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Tu sesión venció')).not.toBeInTheDocument()
    expect(queryClient.getQueryData(['accounts'])).toBeUndefined()
  })
})
