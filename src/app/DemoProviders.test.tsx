import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/features/session/LoginPage'
import DemoProviders from './DemoProviders'

afterEach(() => vi.unstubAllGlobals())

describe('demo tools integration', () => {
  it('opens from the login logo, closes with Escape and keeps an active simulation visible', async () => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
    render(<MemoryRouter><DemoProviders><LoginPage /></DemoProviders></MemoryRouter>)
    const logo = screen.getByRole('button', { name: 'Wallet' })
    for (let tap = 0; tap < 4; tap++) await userEvent.click(logo)
    expect(screen.queryByRole('heading', { name: 'Modo de demostración' })).not.toBeInTheDocument()
    await userEvent.click(logo)
    expect(await screen.findByRole('heading', { name: 'Modo de demostración' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'API sin conexión' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('heading', { name: 'Modo de demostración' })).not.toBeInTheDocument()
    expect(screen.getByText(/Simulación activa/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Apagar todo' }))
    expect(screen.queryByText(/Simulación activa/)).not.toBeInTheDocument()
  })
})
