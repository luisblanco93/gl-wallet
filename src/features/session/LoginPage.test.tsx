import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { networkError, toApiError } from '@/api/errors'
import { DEMO_SESSION, createTestProviders } from '@/test/providers'
import { LoginPage } from './LoginPage'

function setup() {
  const providers = createTestProviders({ signedIn: false, initialPath: '/login' })
  render(<LoginPage />, { wrapper: providers.wrapper })
  return providers
}

const email = () => screen.getByLabelText('Email')
const password = () => screen.getByLabelText('Contraseña')
const submit = () => screen.getByRole('button', { name: 'Iniciar sesión' })

describe('LoginPage', () => {
  it('shows per-field errors without calling the API and focuses the first one', async () => {
    const { api } = setup()
    await userEvent.click(submit())
    expect(screen.getByText('Ingresa tu email.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument()
    expect(email()).toHaveAttribute('aria-invalid', 'true')
    expect(email()).toHaveFocus()
    expect(api.login).not.toHaveBeenCalled()
  })


  it('shows wrong credentials and keeps the email', async () => {
    const { api } = setup()
    api.login.mockRejectedValue(toApiError(401, { error: 'Invalid email or password' }))
    await userEvent.type(email(), 'demo@example.com')
    await userEvent.type(password(), 'wrong')
    await userEvent.click(submit())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Email o contraseña incorrectos')
    expect(alert).toHaveTextContent('Revisa los datos e inténtalo de nuevo.')
    expect(email()).toHaveValue('demo@example.com')
  })

  it('shows a connection error without blaming the credentials', async () => {
    const { api } = setup()
    api.login.mockRejectedValue(networkError())
    await userEvent.type(email(), 'demo@example.com')
    await userEvent.type(password(), 'demo123')
    await userEvent.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con el servidor')
  })

  it('disables the form while signing in', async () => {
    const { api } = setup()
    api.login.mockImplementation(() => new Promise(() => {}))
    await userEvent.type(email(), 'demo@example.com')
    await userEvent.type(password(), 'demo123')
    await userEvent.click(submit())
    const sending = await screen.findByRole('button', { name: 'Iniciando sesión…' })
    expect(sending).toBeDisabled()
    expect(email()).toBeDisabled()
  })

  it('stores the session on success', async () => {
    const { api, sessionStore } = setup()
    api.login.mockResolvedValue(DEMO_SESSION)
    await userEvent.type(email(), 'demo@example.com')
    await userEvent.type(password(), 'demo123')
    await userEvent.click(submit())
    await waitFor(() => expect(sessionStore.getState().status).toBe('signedIn'))
  })

})

describe('LoginPage after the session expired', () => {
  it('warns that the session ended without claiming a cause', () => {
    const providers = createTestProviders({ initialPath: '/login' })
    providers.sessionStore.signOut('expired')
    render(<LoginPage />, { wrapper: providers.wrapper })
    const warning = screen.getByRole('status', { name: '' })
    expect(warning).toHaveTextContent('Tu sesión venció')
    expect(warning).toHaveTextContent('Por seguridad, cerramos tu sesión. Inicia sesión de nuevo para continuar.')
  })
})
