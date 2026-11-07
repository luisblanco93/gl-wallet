import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { appRoutes } from '@/app/routes'
import type { Account, Movement, Transfer } from '@/domain/types'
import { createTestProviders } from '@/test/providers'

/** Testing Library normalizes the page's non-breaking spaces to plain spaces. */
const NBSP = ' '

const PESOS: Account = { id: 'acc-1', name: 'Cuenta Pesos', currency: 'ARS', balance: 85500000 }
const DOLLARS: Account = { id: 'acc-2', name: 'Cuenta Dolares', currency: 'USD', balance: 44000 }

type FakeApi = ReturnType<typeof createTestProviders>['api']

function side(direction: 'out' | 'in', status: Movement['status'], createdAt: string): Movement {
  return {
    id: `transfer-1-${direction}`,
    accountId: direction === 'out' ? 'acc-1' : 'acc-4',
    type: 'transfer',
    direction,
    amount: 500000,
    currency: 'ARS',
    category: 'transfer',
    description: '',
    status,
    counterpartAccountId: direction === 'out' ? 'acc-4' : 'acc-1',
    transferId: 'transfer-1',
    createdAt,
  }
}

function transfer(status: Movement['status'], createdAt = new Date().toISOString()): Transfer {
  return { id: 'transfer-1', status, from: side('out', status, createdAt), to: side('in', status, createdAt) }
}

/** Stubs the API before rendering: the queries start on the first render. */
function setup(stub: (api: FakeApi) => void = () => {}) {
  const providers = createTestProviders()
  providers.api.listAccounts.mockResolvedValue([PESOS, DOLLARS])
  providers.api.listPendingTransfers.mockResolvedValue([])
  providers.api.listMovements.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 })
  stub(providers.api)
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/transferir'] })
  render(
    <providers.Providers>
      <RouterProvider router={router} />
    </providers.Providers>,
  )
  return providers
}

const confirmButton = () => screen.getByRole('button', { name: /^Confirmar y transferir/ })

/** Fills a P2P transfer of $ 5.000 to acc-4 from Cuenta Pesos and opens the review. */
async function reviewP2p(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole('radio', { name: /^Cuenta Pesos/ })).toHaveAttribute('aria-checked', 'true')
  await user.click(screen.getByRole('tab', { name: 'Otra persona' }))
  await user.type(screen.getByLabelText('ID de la cuenta destino'), 'acc-4')
  await user.type(screen.getByLabelText('Monto en Cuenta Pesos'), '5000')
  await user.click(screen.getByRole('button', { name: /^Revisar transferencia/ }))
  expect(await screen.findByRole('heading', { name: 'Revisa antes de confirmar' })).toBeInTheDocument()
}

describe('TransferPage', () => {
  it('sends exactly one transfer when confirm is activated twice', async () => {
    const user = userEvent.setup()
    const { api } = setup((fake) => fake.createTransfer.mockImplementation(() => new Promise(() => {})))
    await reviewP2p(user)
    expect(screen.getByText('Revisa el ID: las transferencias no se pueden revertir')).toBeInTheDocument()

    await user.dblClick(confirmButton())
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))

    expect(api.createTransfer).toHaveBeenCalledOnce()
    expect(api.createTransfer).toHaveBeenCalledWith({
      fromAccountId: 'acc-1',
      toAccountId: 'acc-4',
      amount: 500000,
      description: '',
    })
    expect(screen.getByRole('button', { name: /Enviando transferencia/ })).toBeDisabled()
  })

  it('shows the refreshed available when the API rejects for insufficient funds', async () => {
    const user = userEvent.setup()
    const { api } = setup((fake) => fake.createTransfer.mockRejectedValue(new ApiError('insufficientFunds')))
    await reviewP2p(user)
    // Another device spent most of the balance meanwhile: the refetch after the 422 brings it.
    api.listAccounts.mockResolvedValue([{ ...PESOS, balance: 300000 }, DOLLARS])

    await user.click(confirmButton())

    expect(await screen.findByRole('heading', { name: 'Fondos insuficientes' })).toBeInTheDocument()
    expect(screen.getByText('Disponible actual').nextSibling).toHaveTextContent(`$${NBSP}3.000,00`)
    expect(screen.getByText('No se debitó dinero de tu cuenta.', { exact: false })).toBeInTheDocument()
  })

  it('goes from processing to credited when the transfer settles', async () => {
    const user = userEvent.setup()
    setup((fake) => {
      fake.createTransfer.mockResolvedValue(transfer('pending'))
      // Settles on the second status check, about a second after creation.
      fake.getTransfer.mockResolvedValueOnce(transfer('pending')).mockResolvedValue(transfer('completed'))
    })
    await reviewP2p(user)

    await user.click(confirmButton())

    expect(await screen.findByRole('heading', { name: 'Procesando tu transferencia' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Transferencia acreditada' }, { timeout: 3000 })).toBeInTheDocument()
  })

  it('returns to the destination field with its value when the destination does not exist', async () => {
    const user = userEvent.setup()
    setup((fake) => fake.createTransfer.mockRejectedValue(new ApiError('notFound')))
    await reviewP2p(user)

    await user.click(confirmButton())
    expect(await screen.findByRole('heading', { name: 'La cuenta destino no existe' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Corregir destino' }))

    const field = screen.getByLabelText('ID de la cuenta destino')
    expect(field).toHaveValue('acc-4')
    expect(field).toHaveFocus()
    expect(within(screen.getByRole('tablist')).getByRole('tab', { name: 'Otra persona' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
