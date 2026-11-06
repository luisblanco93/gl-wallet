import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { networkError } from '@/api/errors'
import { appRoutes } from '@/app/routes'
import type { Account, Movement } from '@/domain/types'
import { createTestProviders } from '@/test/providers'

/** Testing Library normalizes the page's non-breaking spaces to plain spaces. */
const NBSP = ' '
const MINUS = '−'

const PESOS: Account = { id: 'acc-1', name: 'Cuenta Pesos', currency: 'ARS', balance: 85500000 }
const DOLLARS: Account = { id: 'acc-2', name: 'Cuenta Dolares', currency: 'USD', balance: 44000 }

type FakeApi = ReturnType<typeof createTestProviders>['api']

/** Stubs the API before rendering: the queries start on the first render. */
function setup(stub: (api: FakeApi) => void = () => {}) {
  const providers = createTestProviders()
  providers.api.listAccounts.mockResolvedValue([PESOS, DOLLARS])
  providers.api.listPendingTransfers.mockResolvedValue([])
  providers.api.listMovements.mockResolvedValue({ items: [], page: 1, pageSize: 5, total: 0 })
  stub(providers.api)
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/movimientos/nuevo'] })
  render(
    <providers.Providers>
      <RouterProvider router={router} />
    </providers.Providers>,
  )
  return { ...providers, router }
}

const account = (name: string) => screen.findByRole('radio', { name: new RegExp(`^${name}`) })
const submit = () => screen.getByRole('button', { name: 'Registrar movimiento' })

describe('NewMovementPage', () => {
  it('blocks an expense above available: message on the amount, submit disabled, nothing sent', async () => {
    const { api } = setup()
    await userEvent.click(await account('Cuenta Dolares'))
    await userEvent.type(screen.getByLabelText('Monto en Cuenta Dolares'), '1.000')

    expect(screen.getByText(`Supera tu disponible de US$${NBSP}440,00`)).toBeInTheDocument()
    expect(screen.getByLabelText('Monto en Cuenta Dolares')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Este gasto supera tu disponible')).toBeInTheDocument()
    expect(submit()).toBeDisabled()
    await userEvent.click(submit())
    expect(api.createMovement).not.toHaveBeenCalled()
  })

  it('records a valid expense and goes home with the new available', async () => {
    const { api, router } = setup()
    api.createMovement.mockResolvedValue({
      id: 'txn-9',
      accountId: 'acc-1',
      type: 'expense',
      direction: null,
      amount: 500000,
      currency: 'ARS',
      category: 'groceries',
      description: '',
      status: 'completed',
      counterpartAccountId: null,
      transferId: null,
      createdAt: '2026-11-06T15:00:00Z',
    } satisfies Movement)

    expect(await account('Cuenta Pesos')).toHaveAttribute('aria-checked', 'true')
    await userEvent.type(screen.getByLabelText('Monto en Cuenta Pesos'), '5000')
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'groceries')
    await userEvent.click(submit())

    expect(api.createMovement).toHaveBeenCalledTimes(1)
    expect(api.createMovement).toHaveBeenCalledWith({
      accountId: 'acc-1',
      type: 'expense',
      amount: 500000,
      category: 'groceries',
      description: '',
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    const toast = await screen.findByText('Gasto registrado')
    expect(toast.parentElement).toHaveTextContent(
      `${MINUS}$${NBSP}5.000,00 en Cuenta Pesos. Nuevo disponible: $${NBSP}850.000,00.`,
    )
  })

  it('blocks expenses while available is unknown and lets the user retry (fail closed)', async () => {
    const { api } = setup((fake) => fake.listPendingTransfers.mockRejectedValue(networkError()))
    await userEvent.click(await account('Cuenta Pesos'))
    await userEvent.type(screen.getByLabelText('Monto en Cuenta Pesos'), '1')

    expect(await screen.findByText('No pudimos calcular tu disponible')).toBeInTheDocument()
    expect(submit()).toBeDisabled()
    api.listPendingTransfers.mockResolvedValue([])
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(submit()).toBeEnabled())
    expect(api.createMovement).not.toHaveBeenCalled()
  })

  it('after a network error asks to check the movements before retrying, and refreshes them', async () => {
    const { api } = setup()
    api.createMovement.mockRejectedValue(networkError())
    await userEvent.click(await account('Cuenta Pesos'))
    await userEvent.type(screen.getByLabelText('Monto en Cuenta Pesos'), '5000')
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'groceries')
    const accountsCalls = api.listAccounts.mock.calls.length
    await userEvent.click(submit())

    expect(await screen.findByText(/Puede que se haya registrado/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revisar Movimientos' })).toHaveAttribute('href', '/movimientos')
    expect(screen.getByLabelText('Monto en Cuenta Pesos')).toHaveValue('5.000,00')
    await waitFor(() => expect(api.listAccounts.mock.calls.length).toBeGreaterThan(accountsCalls))
  })

  it('lists the missing fields on submit without sending anything', async () => {
    const { api } = setup()
    await account('Cuenta Pesos')
    await userEvent.click(submit())

    const summary = await screen.findByText('Revisa 2 campos')
    await waitFor(() => expect(summary.closest('div[tabindex]')).toHaveFocus())
    expect(screen.getByText('Ingresa un monto.')).toBeInTheDocument()
    expect(screen.getByText('Elige una categoría.')).toBeInTheDocument()
    expect(api.createMovement).not.toHaveBeenCalled()
  })
})
