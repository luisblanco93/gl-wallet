import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Movement } from '@/domain/types'
import { BlockedError } from '@/features/blockedError'
import { createTestProviders } from '@/test/providers'
import { useEditMovement } from './useEditMovement'

const EXPENSE: Movement = {
  id: 'txn-5',
  accountId: 'acc-1',
  type: 'expense',
  direction: null,
  amount: 500000,
  currency: 'ARS',
  category: 'groceries',
  description: 'Supermercado',
  status: 'completed',
  counterpartAccountId: null,
  transferId: null,
  createdAt: '2026-11-01T10:00:00.000Z',
}

function setup() {
  const providers = createTestProviders()
  const hook = renderHook(() => useEditMovement(), { wrapper: providers.wrapper })
  return { ...providers, ...hook }
}

describe('useEditMovement', () => {
  it('saves the new category and refreshes the money queries', async () => {
    const { api, queryClient, result } = setup()
    api.updateMovement.mockResolvedValue({ ...EXPENSE, category: 'other' })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => result.current.submit({ movement: EXPENSE, edit: { category: 'other', description: 'Supermercado' } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.updateMovement).toHaveBeenCalledWith('txn-5', { category: 'other', description: 'Supermercado' })
    expect(invalidate).toHaveBeenCalledTimes(3)
  })

  it('sends no request to edit a transfer', async () => {
    const { api, result } = setup()
    const transfer: Movement = { ...EXPENSE, type: 'transfer', direction: 'out', category: 'transfer', counterpartAccountId: 'acc-4' }

    act(() => result.current.submit({ movement: transfer, edit: { category: 'other', description: '' } }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as BlockedError<string>).problem).toBe('transferNotEditable')
    expect(api.updateMovement).not.toHaveBeenCalled()
  })
})
