import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NewMovement } from '@/api/endpoints'
import { ApiError, networkError } from '@/api/errors'
import type { Movement } from '@/domain/types'
import { BlockedError } from '@/features/blockedError'
import { createTestProviders } from '@/test/providers'
import { useCreateMovement } from './useCreateMovement'

const EXPENSE: NewMovement = {
  accountId: 'acc-1',
  type: 'expense',
  amount: 500000,
  category: 'groceries',
  description: 'Supermercado',
}

const CREATED: Movement = {
  ...EXPENSE,
  id: 'txn-99',
  direction: null,
  currency: 'ARS',
  status: 'completed',
  counterpartAccountId: null,
  createdAt: '2026-11-06T12:00:00.000Z',
}

function setup() {
  const providers = createTestProviders()
  const hook = renderHook(() => useCreateMovement(), { wrapper: providers.wrapper })
  return { ...providers, ...hook }
}

describe('useCreateMovement', () => {
  it('creates an expense within available and refreshes accounts, pending transfers and movements', async () => {
    const { api, queryClient, result } = setup()
    api.createMovement.mockResolvedValue(CREATED)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => result.current.submit({ movement: EXPENSE, available: 85500000 }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.createMovement).toHaveBeenCalledWith(EXPENSE)
    expect(result.current.data).toEqual(CREATED)
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey)
    expect(keys).toEqual([['accounts'], ['pendingTransfers'], ['movements']])
  })

  it('sends no request for an expense above available', async () => {
    const { api, result } = setup()
    act(() => result.current.submit({ movement: { ...EXPENSE, amount: 100000 }, available: 44000 }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(BlockedError)
    expect((result.current.error as BlockedError<string>).problem).toBe('insufficient')
    expect(api.createMovement).not.toHaveBeenCalled()
  })

  it('sends no request for an expense while available is unknown', async () => {
    const { api, result } = setup()
    act(() => result.current.submit({ movement: EXPENSE, available: 'unknown' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as BlockedError<string>).problem).toBe('unknownAvailable')
    expect(api.createMovement).not.toHaveBeenCalled()
  })

  it('sends one request when the form is submitted twice while in flight', async () => {
    const { api, result } = setup()
    api.createMovement.mockImplementation(() => new Promise(() => {}))

    act(() => {
      result.current.submit({ movement: EXPENSE, available: 85500000 })
      result.current.submit({ movement: EXPENSE, available: 85500000 })
    })

    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(api.createMovement).toHaveBeenCalledOnce()
  })

  it('does not retry a network failure, and lets the user resubmit', async () => {
    const { api, result } = setup()
    api.createMovement.mockRejectedValueOnce(networkError())

    act(() => result.current.submit({ movement: EXPENSE, available: 85500000 }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(api.createMovement).toHaveBeenCalledOnce()

    api.createMovement.mockResolvedValueOnce(CREATED)
    act(() => result.current.submit({ movement: EXPENSE, available: 85500000 }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.createMovement).toHaveBeenCalledTimes(2)
  })
})
