import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { networkError } from '@/api/errors'
import type { Movement, Transfer } from '@/domain/types'
import { createTestProviders, type TestProviders } from '@/test/providers'
import { useTransferStatus } from './useTransferStatus'

function createdTransfer(createdAtMs: number): Transfer {
  const from: Movement = {
    id: 'transfer-1-out',
    accountId: 'acc-1',
    type: 'transfer',
    direction: 'out',
    amount: 500_000,
    currency: 'ARS',
    category: 'transfer',
    status: 'pending',
    counterpartAccountId: 'acc-4',
    transferId: 'transfer-1',
    description: '',
    createdAt: new Date(createdAtMs).toISOString(),
  }
  return { id: 'transfer-1', status: 'pending', from, to: null }
}

/** The fake API is stubbed before the hook mounts: its first status request runs on mount. */
function setup(created: Transfer, stub: (api: TestProviders['api']) => void) {
  const providers = createTestProviders()
  stub(providers.api)
  const invalidate = vi.spyOn(providers.queryClient, 'invalidateQueries')
  const hook = renderHook(() => useTransferStatus(created), { wrapper: providers.wrapper })
  return { ...providers, ...hook, invalidate }
}

describe('useTransferStatus', () => {
  it('shows processing, then completed once the API reports it, and refreshes balances', async () => {
    const created = createdTransfer(Date.now())
    const { api, result, invalidate } = setup(created, (fake) =>
      fake.getTransfer.mockResolvedValue({ ...created, status: 'completed' }),
    )

    expect(result.current).toBe('processing')
    await waitFor(() => expect(result.current).toBe('completed'))
    expect(api.getTransfer).toHaveBeenCalledWith('transfer-1')
    await waitFor(() =>
      expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual(
        expect.arrayContaining([['accounts'], ['pendingTransfers'], ['movements']]),
      ),
    )
  })

  it('reports delayed when the transfer is still pending 10 s after creation', async () => {
    const created = createdTransfer(Date.now() - 11_000)
    const { result } = setup(created, (fake) => fake.getTransfer.mockResolvedValue(created))

    await waitFor(() => expect(result.current).toBe('delayed'))
  })

  it('keeps processing and polling when a status request fails before 10 s', async () => {
    const created = createdTransfer(Date.now())
    const { api, result } = setup(created, (fake) => fake.getTransfer.mockRejectedValue(networkError()))

    // The second call comes from the next 1 s tick, after the first one failed.
    await waitFor(() => expect(api.getTransfer).toHaveBeenCalledTimes(2), { timeout: 3000 })
    expect(result.current).toBe('processing')
  })

  it('stops as failed when the API reports a failed transfer, and refreshes balances', async () => {
    const created = createdTransfer(Date.now())
    const { result, invalidate } = setup(created, (fake) =>
      fake.getTransfer.mockResolvedValue({ ...created, status: 'failed' }),
    )

    await waitFor(() => expect(result.current).toBe('failed'))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] }))
  })
})
