import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { MovementPage } from '@/api/endpoints'
import { networkError, toApiError } from '@/api/errors'
import { appRoutes } from '@/app/routes'
import type { Account, Movement } from '@/domain/types'
import { createTestProviders } from '@/test/providers'

const PESOS: Account = { id: 'acc-1', name: 'Cuenta Pesos', currency: 'ARS', balance: 85500000 }

const GROCERIES: Movement = {
  id: 'txn-1',
  accountId: 'acc-1',
  type: 'expense',
  direction: null,
  amount: 5200000,
  currency: 'ARS',
  category: 'groceries',
  description: 'Supermercado',
  status: 'completed',
  counterpartAccountId: null,
  transferId: null,
  createdAt: '2026-11-04T15:00:00Z',
}

const TRANSFER: Movement = {
  ...GROCERIES,
  id: 'transfer-1-out',
  type: 'transfer',
  direction: 'out',
  amount: 2000000,
  category: 'transfer',
  description: 'Pago compartido',
  status: 'pending',
  counterpartAccountId: 'acc-4',
  transferId: 'transfer-1',
}

const page = (items: Movement[], total = items.length): MovementPage => ({ items, page: 1, pageSize: 10, total })

function setup(path: string, stub: (api: ReturnType<typeof createTestProviders>['api']) => void) {
  const providers = createTestProviders()
  providers.api.listAccounts.mockResolvedValue([PESOS])
  providers.api.listPendingTransfers.mockResolvedValue([])
  stub(providers.api)
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <providers.Providers>
      <RouterProvider router={router} />
    </providers.Providers>,
  )
  return { ...providers, router }
}

const rowNamed = (name: RegExp) => screen.findByRole('button', { name })

describe('MovementsPage', () => {
  it('filters by account from page 1 and shows the filtered counter and chip', async () => {
    const { api } = setup('/movimientos?page=2', (fake) => fake.listMovements.mockResolvedValue(page([GROCERIES], 1)))
    await rowNamed(/^Supermercado\./)

    await userEvent.selectOptions(screen.getByLabelText('Cuenta'), 'acc-1')
    await waitFor(() =>
      expect(api.listMovements).toHaveBeenLastCalledWith({ accountId: 'acc-1', page: 1, pageSize: 10 }),
    )
    expect(screen.getByRole('button', { name: 'Quitar filtro Cuenta: Cuenta Pesos' })).toBeInTheDocument()
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
  })

  it('offers to clear the filters when nothing matches', async () => {
    const { api } = setup('/movimientos?type=income', (fake) => fake.listMovements.mockResolvedValue(page([])))
    const empty = await screen.findByRole('status', { name: '' })
    await within(empty).findByText('No hay movimientos con estos filtros')

    api.listMovements.mockResolvedValue(page([GROCERIES]))
    await userEvent.click(within(empty).getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(api.listMovements).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 }))
    expect(await rowNamed(/^Supermercado\./)).toBeInTheDocument()
  })

  it('moves a page past the end to the last page', async () => {
    const { api } = setup('/movimientos?page=9', (fake) =>
      fake.listMovements.mockImplementation(({ page: pageNumber }) =>
        Promise.resolve({ items: pageNumber === 3 ? [GROCERIES] : [], page: pageNumber, pageSize: 10, total: 23 }),
      ),
    )
    expect(await screen.findByText('Página 3 de 3')).toBeInTheDocument()
    expect(api.listMovements).toHaveBeenLastCalledWith({ page: 3, pageSize: 10 })
    expect(screen.getByText('Mostrando 21–23 de 23')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    expect(screen.queryByText('Aún no tienes movimientos')).not.toBeInTheDocument()
  })

  it('shows an error with a retry when the list fails', async () => {
    const { api } = setup('/movimientos', (fake) => fake.listMovements.mockRejectedValue(networkError()))
    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('No pudimos cargar tus movimientos')

    api.listMovements.mockResolvedValue(page([GROCERIES]))
    await userEvent.click(within(error).getByRole('button', { name: 'Reintentar' }))
    expect(await rowNamed(/^Supermercado\./)).toBeInTheDocument()
  })
})

describe('Movement detail', () => {
  it('explains that a transfer cannot be edited, then closes back to the filtered list', async () => {
    const { api, router } = setup('/movimientos?accountId=acc-1', (fake) => {
      fake.listMovements.mockResolvedValue(page([TRANSFER]))
      fake.getMovement.mockResolvedValue(TRANSFER)
    })
    await userEvent.click(await rowNamed(/^Transferencia a acc-4\./))

    const detail = await screen.findByRole('dialog', { name: 'Detalle del movimiento' })
    expect(await within(detail).findByText('Las transferencias no se pueden editar')).toBeInTheDocument()
    expect(within(detail).getByText('transfer-1')).toBeInTheDocument()
    expect(within(detail).queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    expect(api.getMovement).toHaveBeenCalledWith('transfer-1-out')

    await userEvent.click(within(detail).getByRole('button', { name: 'Cerrar detalle' }))
    expect(router.state.location.pathname).toBe('/movimientos')
    expect(router.state.location.search).toBe('?accountId=acc-1')
    await waitFor(() => expect(screen.getByRole('button', { name: /^Transferencia a acc-4\./ })).toHaveFocus())
  })

  it('saves a new category and confirms it inside the panel, keeping the amount locked', async () => {
    const { api } = setup('/movimientos/txn-1', (fake) => {
      fake.listMovements.mockResolvedValue(page([GROCERIES]))
      fake.getMovement.mockResolvedValue(GROCERIES)
      fake.updateMovement.mockResolvedValue({ ...GROCERIES, category: 'other' })
    })
    const detail = await screen.findByRole('dialog', { name: 'Detalle del movimiento' })
    expect(await within(detail).findByText('Bloqueado')).toBeInTheDocument()

    api.getMovement.mockResolvedValue({ ...GROCERIES, category: 'other' })
    await userEvent.selectOptions(within(detail).getByLabelText('Categoría'), 'other')
    await userEvent.click(within(detail).getByRole('button', { name: 'Guardar cambios' }))

    expect(api.updateMovement).toHaveBeenCalledWith('txn-1', { category: 'other', description: 'Supermercado' })
    // Inside the dialog: a modal makes the app's toast region inert, so the toast would not be seen.
    expect(await within(detail).findByRole('status', { name: '' })).toHaveTextContent('Cambios guardados')
    await waitFor(() => expect(within(detail).getByLabelText('Categoría')).toHaveValue('other'))
  })

  it('keeps the stored values when the server rejects the edit', async () => {
    const { api } = setup('/movimientos/txn-1', (fake) => {
      fake.listMovements.mockResolvedValue(page([GROCERIES]))
      fake.getMovement.mockResolvedValue(GROCERIES)
      fake.updateMovement.mockRejectedValue(toApiError(400, { error: 'Transfers cannot be edited' }))
    })
    const detail = await screen.findByRole('dialog', { name: 'Detalle del movimiento' })
    await userEvent.selectOptions(await within(detail).findByLabelText('Categoría'), 'other')
    await userEvent.click(within(detail).getByRole('button', { name: 'Guardar cambios' }))

    expect(await within(detail).findByRole('alert')).toHaveTextContent('No pudimos guardar los cambios')
    expect(within(detail).queryByText('Transfers cannot be edited')).not.toBeInTheDocument()
    const facts = within(detail).getAllByRole('definition').map((fact) => fact.textContent)
    expect(facts).toContain('Supermercado')
    expect(api.updateMovement).toHaveBeenCalledTimes(1)
  })
})
