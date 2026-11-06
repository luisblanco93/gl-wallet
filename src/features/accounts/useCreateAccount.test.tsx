import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BlockedError } from '@/features/blockedError'
import { createTestProviders } from '@/test/providers'
import { useCreateAccount } from './useCreateAccount'

function setup() {
  const providers = createTestProviders()
  const hook = renderHook(() => useCreateAccount(), { wrapper: providers.wrapper })
  return { ...providers, ...hook }
}

describe('useCreateAccount', () => {
  it('creates the account with a trimmed name and refreshes the account list', async () => {
    const { api, queryClient, result } = setup()
    api.createAccount.mockResolvedValue({ id: 'acc-9', name: 'Ahorro', currency: 'ARS', balance: 0 })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => result.current.submit({ name: '  Ahorro ', currency: 'ARS' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.createAccount).toHaveBeenCalledWith({ name: 'Ahorro', currency: 'ARS' })
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toContainEqual(['accounts'])
  })

  it('shows a field error without calling the API when the name is too short', async () => {
    const { api, result } = setup()
    act(() => result.current.submit({ name: 'A', currency: 'ARS' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as BlockedError<string>).problem).toBe('nameTooShort')
    expect(api.createAccount).not.toHaveBeenCalled()
  })
})
