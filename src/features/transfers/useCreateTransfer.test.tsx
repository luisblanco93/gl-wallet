import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NewTransfer } from '@/api/endpoints'
import { ApiError } from '@/api/errors'
import { BlockedError } from '@/features/blockedError'
import { createTestProviders } from '@/test/providers'
import { useCreateTransfer } from './useCreateTransfer'

const TRANSFER: NewTransfer = { fromAccountId: 'acc-1', toAccountId: 'acc-4', amount: 500_000, description: '' }

function setup() {
  const providers = createTestProviders()
  const hook = renderHook(() => useCreateTransfer(), { wrapper: providers.wrapper })
  return { ...providers, ...hook }
}

describe('useCreateTransfer', () => {
  it('sends no request when the current available no longer covers the amount', async () => {
    const { api, result } = setup()

    act(() => result.current.submit({ transfer: TRANSFER, available: 100_000 }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as BlockedError<string>).problem).toBe('insufficient')
    expect(api.createTransfer).not.toHaveBeenCalled()
  })

  it('sends one request when confirm is activated twice while in flight', async () => {
    const { api, result } = setup()
    api.createTransfer.mockImplementation(() => new Promise(() => {}))

    act(() => {
      result.current.submit({ transfer: TRANSFER, available: 85_500_000 })
      result.current.submit({ transfer: TRANSFER, available: 85_500_000 })
    })

    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(api.createTransfer).toHaveBeenCalledOnce()
  })

  it('refetches balances and pending transfers before reporting insufficient funds', async () => {
    const { api, queryClient, result } = setup()
    api.createTransfer.mockRejectedValue(new ApiError('insufficientFunds'))
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    let keysWhenErrorShown: unknown[] = []

    act(() => result.current.submit({ transfer: TRANSFER, available: 85_500_000 }))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      keysWhenErrorShown = invalidate.mock.calls.map(([filters]) => filters?.queryKey)
    })
    expect((result.current.error as ApiError).kind).toBe('insufficientFunds')
    expect(keysWhenErrorShown).toEqual([['accounts'], ['pendingTransfers'], ['movements']])
  })
})
