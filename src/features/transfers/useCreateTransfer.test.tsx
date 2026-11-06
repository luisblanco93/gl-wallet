import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NewTransfer } from '@/api/endpoints'
import { ApiError, networkError } from '@/api/errors'
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

  it('sends no request for an amount that is not a positive whole number of cents', async () => {
    for (const amount of [Number.NaN, -100, 10.5]) {
      const { api, result } = setup()

      act(() => result.current.submit({ transfer: { ...TRANSFER, amount }, available: 85_500_000 }))

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect((result.current.error as BlockedError<string>).problem).toBe('invalidAmount')
      expect(api.createTransfer).not.toHaveBeenCalled()
    }
  })

  it('sends no second request when the form is mounted again while one is in flight', async () => {
    const { api, wrapper, result, unmount } = setup()
    api.createTransfer.mockImplementation(() => new Promise(() => {}))

    act(() => result.current.submit({ transfer: TRANSFER, available: 85_500_000 }))
    await waitFor(() => expect(api.createTransfer).toHaveBeenCalledOnce())
    unmount()

    const remounted = renderHook(() => useCreateTransfer(), { wrapper })
    act(() => remounted.result.current.submit({ transfer: TRANSFER, available: 85_500_000 }))
    // Give a second mutation time to reach the API, so the assertion can actually fail.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))

    expect(api.createTransfer).toHaveBeenCalledOnce()
  })

  it('refetches before reporting when the outcome is unknown (network or server error)', async () => {
    for (const error of [networkError(), new ApiError('server')]) {
      const { api, queryClient, result } = setup()
      api.createTransfer.mockRejectedValue(error)
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
      let keysWhenErrorShown: unknown[] = []

      act(() => result.current.submit({ transfer: TRANSFER, available: 85_500_000 }))

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        keysWhenErrorShown = invalidate.mock.calls.map(([filters]) => filters?.queryKey)
      })
      expect(keysWhenErrorShown).toEqual([['accounts'], ['pendingTransfers'], ['movements']])
    }
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
