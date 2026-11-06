import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { networkError } from '@/api/errors'
import { canDebit } from '@/domain/funds'
import type { Account, Movement } from '@/domain/types'
import { createTestProviders } from '@/test/providers'
import { useAccounts } from './useAccounts'

const PESOS: Account = { id: 'acc-1', name: 'Cuenta Pesos', currency: 'ARS', balance: 85500000 }
const ANA: Account = { id: 'acc-3', name: 'Cuenta de Ana', currency: 'ARS', balance: 72000000 }

const PENDING_OUT: Movement = {
  id: 'transfer-1-out',
  accountId: ANA.id,
  type: 'transfer',
  direction: 'out',
  amount: 50000000,
  currency: 'ARS',
  category: 'transfer',
  description: '',
  status: 'pending',
  counterpartAccountId: 'acc-4',
  transferId: null,
  createdAt: '2026-11-06T12:00:00.000Z',
}

const never = <T,>() => new Promise<T>(() => {})

function setup() {
  const providers = createTestProviders()
  const render = () => renderHook(() => useAccounts(), { wrapper: providers.wrapper })
  return { ...providers, render }
}

describe('useAccounts', () => {
  it('is loading while the accounts load, never showing a zero balance', () => {
    const { api, render } = setup()
    api.listAccounts.mockImplementation(never)
    api.listPendingTransfers.mockResolvedValue([])
    const { result } = render()
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('reports an error with a retry when the accounts fail', async () => {
    const { api, render } = setup()
    api.listAccounts.mockRejectedValue(networkError())
    api.listPendingTransfers.mockResolvedValue([])
    const { result } = render()
    await waitFor(() => expect(result.current.status).toBe('error'))

    api.listAccounts.mockResolvedValue([PESOS])
    act(() => {
      if (result.current.status === 'error') result.current.retry()
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('makes available equal to the balance when nothing is pending', async () => {
    const { api, render } = setup()
    api.listAccounts.mockResolvedValue([PESOS])
    api.listPendingTransfers.mockResolvedValue([])
    const { result } = render()
    await waitFor(() => expect(result.current.status === 'ready' && result.current.pending).toBe('ready'))
    if (result.current.status !== 'ready') throw new Error('not ready')
    expect(result.current.accounts).toEqual([
      { ...PESOS, settled: 85500000, inProgress: 0, available: 85500000 },
    ])
  })

  it('subtracts pending outgoing transfers from available', async () => {
    const { api, render } = setup()
    api.listAccounts.mockResolvedValue([PESOS, ANA])
    api.listPendingTransfers.mockResolvedValue([PENDING_OUT])
    const { result } = render()
    await waitFor(() => expect(result.current.status === 'ready' && result.current.pending).toBe('ready'))
    if (result.current.status !== 'ready') throw new Error('not ready')
    const ana = result.current.accounts.find((account) => account.id === ANA.id)
    expect(ana).toMatchObject({ settled: 72000000, inProgress: 50000000, available: 22000000 })
  })

  it('blocks debits while pending transfers are still loading', async () => {
    const { api, render } = setup()
    api.listAccounts.mockResolvedValue([PESOS])
    api.listPendingTransfers.mockImplementation(never)
    const { result } = render()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    if (result.current.status !== 'ready') throw new Error('not ready')
    expect(result.current.pending).toBe('loading')
    const [pesos] = result.current.accounts
    expect(pesos?.settled).toBe(85500000)
    expect(pesos?.available).toBe('unknown')
    expect(canDebit(1, pesos?.available ?? 'unknown')).toEqual({ ok: false, reason: 'unknownAvailable' })
  })

  it('shows the balance, marks available unknown and offers a retry when pending transfers fail', async () => {
    const { api, render } = setup()
    api.listAccounts.mockResolvedValue([PESOS])
    api.listPendingTransfers.mockRejectedValue(networkError())
    const { result } = render()
    await waitFor(() => expect(result.current.status === 'ready' && result.current.pending).toBe('error'))
    if (result.current.status !== 'ready') throw new Error('not ready')
    expect(result.current.accounts[0]).toMatchObject({ settled: 85500000, available: 'unknown' })

    api.listPendingTransfers.mockResolvedValue([])
    act(() => {
      if (result.current.status === 'ready') result.current.retryPending()
    })
    await waitFor(() => expect(result.current.status === 'ready' && result.current.pending).toBe('ready'))
    if (result.current.status !== 'ready') throw new Error('not ready')
    expect(result.current.accounts[0]?.available).toBe(85500000)
  })
})
