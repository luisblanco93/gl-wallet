import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { networkError } from '@/api/errors'
import type { Movement, Transfer } from '@/domain/types'
import { createTestProviders } from '@/test/providers'
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

function setup(created: Transfer) {
  const providers = createTestProviders()
  const hook = renderHook(() => useTransferStatus(created), { wrapper: providers.wrapper })
  return { ...providers, ...hook }
}

describe('useTransferStatus', () => {
  it('shows processing, then completed once the API reports it, and refreshes balances', async () => {
    const created = createdTransfer(Date.now())
    const providers = createTestProviders()
    providers.api.getTransfer.mockResolvedValue({ ...created, status: 'completed' })
    const invalidate = vi.spyOn(providers.queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useTransferStatus(created), { wrapper: providers.wrapper })

    expect(result.current).toBe('processing')
    await waitFor(() => expect(result.current).toBe('completed'))
    expect(providers.api.getTransfer).toHaveBeenCalledWith('transfer-1')
    await waitFor(() =>
      expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual(
        expect.arrayContaining([['accounts'], ['pendingTransfers'], ['movements']]),
      ),
    )
  })

  it('reports delayed when the transfer is still pending 10 s after creation', async () => {
    const created = createdTransfer(Date.now() - 11_000)
    const { api, result } = setup(created)
    api.getTransfer.mockResolvedValue(created)

    await waitFor(() => expect(result.current).toBe('delayed'))
  })

  it('keeps processing when a status request fails before 10 s', async () => {
    const created = createdTransfer(Date.now())
    const { api, result } = setup(created)
    api.getTransfer.mockRejectedValue(networkError())

    await waitFor(() => expect(api.getTransfer).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toBe('processing'))
  })
})
