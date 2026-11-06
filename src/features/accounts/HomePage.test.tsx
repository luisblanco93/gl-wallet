import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { MovementPage } from '@/api/endpoints'
import { networkError } from '@/api/errors'
import type { Account, Movement } from '@/domain/types'
import { createTestProviders } from '@/test/providers'
import { HomePage } from './HomePage'

const NBSP = ' '
const MINUS = '−'

const PESOS: Account = { id: 'acc-1', name: 'Cuenta Pesos', currency: 'ARS', balance: 85500000 }
const DOLLARS: Account = { id: 'acc-2', name: 'Cuenta Dolares', currency: 'USD', balance: 44000 }

const PENDING_OUT: Movement = {
  id: 'transfer-1-out',
  accountId: 'acc-1',
  type: 'transfer',
  direction: 'out',
  amount: 2000000,
  currency: 'ARS',
  category: 'transfer',
  description: 'Pago compartido',
  status: 'pending',
  counterpartAccountId: 'acc-4',
  createdAt: '2026-11-05T17:30:00Z',
}

const never = <T,>() => new Promise<T>(() => {})
const page = (items: Movement[]): MovementPage => ({ items, page: 1, pageSize: 5, total: items.length })

function setup(stub: (api: ReturnType<typeof createTestProviders>['api']) => void) {
  const providers = createTestProviders()
  stub(providers.api)
  render(<HomePage />, { wrapper: providers.wrapper })
  return providers
}

describe('HomePage', () => {
  it('greets the user and shows loading placeholders, never a zero balance', () => {
    setup((api) => {
      api.listAccounts.mockImplementation(never)
      api.listPendingTransfers.mockImplementation(never)
      api.listMovements.mockImplementation(never)
    })
    expect(screen.getByText('Hola, Demo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Tu dinero' })).toBeInTheDocument()
    expect(screen.getByText('Cargando saldos…')).toBeInTheDocument()
    expect(screen.queryByText(/\$ 0,00/)).not.toBeInTheDocument()
  })

  it('shows one card per account with available and in progress, never adding currencies', async () => {
    setup((api) => {
      api.listAccounts.mockResolvedValue([PESOS, DOLLARS])
      api.listPendingTransfers.mockResolvedValue([PENDING_OUT])
      api.listMovements.mockResolvedValue(page([PENDING_OUT]))
    })
    const pesos = await screen.findByRole('article', { name: 'Cuenta Pesos' })
    expect(within(pesos).getByText(`$${NBSP}835.000,00`)).toBeInTheDocument()
    expect(within(pesos).getByText(`En proceso: ${MINUS}$${NBSP}20.000,00`)).toBeInTheDocument()
    expect(within(pesos).getByText('Ya está descontado del disponible.')).toBeInTheDocument()
    const dollars = screen.getByRole('article', { name: 'Cuenta Dolares' })
    expect(within(dollars).getByText(`US$${NBSP}440,00`)).toBeInTheDocument()
    expect(screen.getByText('Cada moneda se muestra por separado: no se suman entre sí.')).toBeInTheDocument()
  })

  it('marks available as unknown with a retry when pending transfers fail', async () => {
    const { api } = setup((fake) => {
      fake.listAccounts.mockResolvedValue([PESOS])
      fake.listPendingTransfers.mockRejectedValue(networkError())
      fake.listMovements.mockResolvedValue(page([]))
    })
    const card = await screen.findByRole('article', { name: 'Cuenta Pesos' })
    expect(await within(card).findByText('No pudimos calcular tu disponible')).toBeInTheDocument()
    expect(within(card).queryByText(`$${NBSP}855.000,00`)).not.toBeInTheDocument()

    api.listPendingTransfers.mockResolvedValue([])
    await userEvent.click(within(card).getByRole('button', { name: 'Reintentar' }))
    expect(await within(card).findByText(`$${NBSP}855.000,00`)).toBeInTheDocument()
  })

  it('shows a single connection error with a retry when the accounts fail', async () => {
    const { api } = setup((fake) => {
      fake.listAccounts.mockRejectedValue(networkError())
      fake.listPendingTransfers.mockResolvedValue([])
      fake.listMovements.mockResolvedValue(page([]))
    })
    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('No fue posible conectar con el servidor')
    expect(screen.queryByText('Últimos movimientos')).not.toBeInTheDocument()

    api.listAccounts.mockResolvedValue([PESOS])
    await userEvent.click(within(error).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('article', { name: 'Cuenta Pesos' })).toBeInTheDocument()
  })

  it('lists the 5 most recent movements', async () => {
    const { api } = setup((fake) => {
      fake.listAccounts.mockResolvedValue([PESOS])
      fake.listPendingTransfers.mockResolvedValue([])
      fake.listMovements.mockResolvedValue(page([PENDING_OUT]))
    })
    expect(await screen.findByText('Transferencia a acc-4')).toBeInTheDocument()
    expect(api.listMovements).toHaveBeenCalledWith({ page: 1, pageSize: 5 })
    expect(screen.getByRole('link', { name: /Ver todos/ })).toHaveAttribute('href', '/movimientos')
  })

  it('invites to record the first movement when there are none', async () => {
    setup((api) => {
      api.listAccounts.mockResolvedValue([PESOS])
      api.listPendingTransfers.mockResolvedValue([])
      api.listMovements.mockResolvedValue(page([]))
    })
    expect(await screen.findByText('Aún no tienes movimientos')).toBeInTheDocument()
  })
})
