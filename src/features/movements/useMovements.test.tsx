import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MovementPage } from '@/api/endpoints'
import { networkError } from '@/api/errors'
import type { Movement } from '@/domain/types'
import { createTestProviders } from '@/test/providers'
import type { MovementListState } from './filters'
import { MOVEMENTS_PAGE_SIZE, useMovements } from './useMovements'

function movement(id: string): Movement {
  return {
    id,
    accountId: 'acc-1',
    type: 'expense',
    direction: null,
    amount: 500000,
    currency: 'ARS',
    category: 'groceries',
    description: 'Supermercado',
    status: 'completed',
    counterpartAccountId: null,
    createdAt: '2026-11-01T10:00:00.000Z',
  }
}

function page(items: Movement[], pageNumber: number, total: number): MovementPage {
  return { items, page: pageNumber, pageSize: MOVEMENTS_PAGE_SIZE, total }
}

/** Stubs the API first: rendering starts the query immediately. */
function setup(initial: MovementListState, stub: (api: ReturnType<typeof createTestProviders>['api']) => void) {
  const providers = createTestProviders()
  stub(providers.api)
  const hook = renderHook((state: MovementListState) => useMovements(state), {
    wrapper: providers.wrapper,
    initialProps: initial,
  })
  return { ...providers, ...hook }
}

describe('useMovements', () => {
  it('asks for the filtered page with 10 rows and gives the visible range', async () => {
    const providers = createTestProviders()
    providers.api.listMovements.mockResolvedValue(page([movement('txn-11'), movement('txn-12')], 2, 12))
    const { result } = renderHook(() => useMovements({ accountId: 'acc-1', page: 2 }), {
      wrapper: providers.wrapper,
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(providers.api.listMovements).toHaveBeenCalledWith({ accountId: 'acc-1', page: 2, pageSize: 10 })
    if (result.current.status !== 'ready') throw new Error('not ready')
    expect(result.current.items.map((m) => m.id)).toEqual(['txn-11', 'txn-12'])
    expect(result.current.range).toEqual({ from: 11, to: 12, total: 12 })
    expect(result.current.empty).toBeNull()
  })

  it('keeps the previous rows on screen while the next page loads', async () => {
    const { api, result, rerender } = setup({ page: 1 }, (fake) =>
      fake.listMovements.mockResolvedValueOnce(page([movement('txn-1')], 1, 11)),
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))

    api.listMovements.mockImplementationOnce(() => new Promise(() => {}))
    rerender({ page: 2 })
    expect(result.current.status).toBe('ready')
    if (result.current.status !== 'ready') throw new Error('not ready')
    expect(result.current.items.map((m) => m.id)).toEqual(['txn-1'])
    expect(result.current.isUpdating).toBe(true)
  })

  it('reports an error with a retry', async () => {
    const { api, result } = setup({ page: 1 }, (fake) => fake.listMovements.mockRejectedValue(networkError()))
    await waitFor(() => expect(result.current.status).toBe('error'))

    api.listMovements.mockResolvedValue(page([movement('txn-1')], 1, 1))
    act(() => {
      if (result.current.status === 'error') result.current.retry()
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('tells "no movements yet" apart from "no results for these filters"', async () => {
    const plain = setup({ page: 1 }, (fake) => fake.listMovements.mockResolvedValue(page([], 1, 0)))
    await waitFor(() => expect(plain.result.current.status).toBe('ready'))
    expect(plain.result.current.status === 'ready' && plain.result.current.empty).toBe('noMovements')

    const filtered = setup({ type: 'income', page: 1 }, (fake) => fake.listMovements.mockResolvedValue(page([], 1, 0)))
    await waitFor(() => expect(filtered.result.current.status).toBe('ready'))
    expect(filtered.result.current.status === 'ready' && filtered.result.current.empty).toBe('noResults')
  })
})
