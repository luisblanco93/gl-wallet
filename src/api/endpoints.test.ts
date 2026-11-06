import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from './client'
import { createWalletApi } from './endpoints'
import { ApiError } from './errors'

function fakeClient(response: unknown) {
  const request = vi.fn<ApiClient['request']>(() => Promise.resolve(response))
  return { api: createWalletApi({ request }), request }
}

/** Opaque session value issued by the mock API at login. */
const DEMO_SESSION = 'session-of-demo-user'

const ACCOUNT_DTO = {
  id: 'acc-1',
  userId: 'user-1',
  name: 'Cuenta Pesos',
  currency: 'ARS',
  createdAt: '2026-08-01T09:00:00Z',
  balance: 855000,
}

const INCOME_DTO = {
  id: 'txn-1',
  accountId: 'acc-1',
  type: 'income',
  direction: null,
  amount: 850000,
  currency: 'ARS',
  category: 'salary',
  description: 'Sueldo septiembre',
  status: 'completed',
  counterpartAccountId: null,
  transferId: null,
  createdAt: '2026-09-01T09:00:00Z',
}

const TRANSFER_OUT_DTO = {
  ...INCOME_DTO,
  id: 'transfer-1-out',
  type: 'transfer',
  direction: 'out',
  amount: 500000,
  category: 'transfer',
  status: 'pending',
  counterpartAccountId: 'acc-4',
  transferId: 'transfer-1',
}

function page(transactions: unknown[], pagination = { page: 1, pageSize: 10, total: transactions.length }) {
  return { transactions, pagination }
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('expected a rejection')
}

describe('login', () => {
  it('posts the credentials without a token and returns the session', async () => {
    const { api, request } = fakeClient({
      token: DEMO_SESSION,
      user: { id: 'user-1', email: 'demo@example.com', name: 'Demo' },
    })
    const session = await api.login('demo@example.com', 'demo123')
    expect(request).toHaveBeenCalledWith('POST', '/auth/login', {
      body: { email: 'demo@example.com', password: 'demo123' },
      auth: false,
    })
    expect(session).toEqual({
      token: DEMO_SESSION,
      user: { id: 'user-1', email: 'demo@example.com', name: 'Demo' },
    })
  })

  it('rejects a response without a token', async () => {
    const { api } = fakeClient({ user: { id: 'user-1', email: 'a@b.c', name: 'A' } })
    expect((await rejection(api.login('a@b.c', 'x'))).kind).toBe('server')
  })
})

describe('accounts', () => {
  it('lists accounts with balances in cents', async () => {
    const { api, request } = fakeClient({
      accounts: [ACCOUNT_DTO, { ...ACCOUNT_DTO, id: 'acc-2', currency: 'USD', balance: 0.30000000000000004 }],
    })
    const accounts = await api.listAccounts()
    expect(request).toHaveBeenCalledWith('GET', '/accounts')
    expect(accounts).toEqual([
      { id: 'acc-1', name: 'Cuenta Pesos', currency: 'ARS', balance: 85500000 },
      { id: 'acc-2', name: 'Cuenta Pesos', currency: 'USD', balance: 30 },
    ])
  })

  it('rejects an account with an unknown currency or a non-numeric balance', async () => {
    const badCurrency = fakeClient({ accounts: [{ ...ACCOUNT_DTO, currency: 'BTC' }] })
    expect((await rejection(badCurrency.api.listAccounts())).kind).toBe('server')
    const badBalance = fakeClient({ accounts: [{ ...ACCOUNT_DTO, balance: '855000' }] })
    expect((await rejection(badBalance.api.listAccounts())).kind).toBe('server')
  })

  it('creates an account', async () => {
    const { api, request } = fakeClient({ account: { ...ACCOUNT_DTO, id: 'acc-9', name: 'Ahorro', balance: 0 } })
    const account = await api.createAccount({ name: 'Ahorro', currency: 'ARS' })
    expect(request).toHaveBeenCalledWith('POST', '/accounts', { body: { name: 'Ahorro', currency: 'ARS' } })
    expect(account).toEqual({ id: 'acc-9', name: 'Ahorro', currency: 'ARS', balance: 0 })
  })
})

describe('listMovements', () => {
  it('sends the filters and page as query parameters', async () => {
    const { api, request } = fakeClient(page([]))
    await api.listMovements({
      accountId: 'acc-1',
      type: 'expense',
      category: 'groceries',
      status: 'completed',
      search: 'super',
      page: 2,
      pageSize: 10,
    })
    expect(request).toHaveBeenCalledWith('GET', '/transactions', {
      query: {
        accountId: 'acc-1',
        type: 'expense',
        category: 'groceries',
        status: 'completed',
        search: 'super',
        page: 2,
        pageSize: 10,
      },
    })
  })

  it('maps movements to the domain with amounts in cents, and the pagination', async () => {
    const { api } = fakeClient(page([INCOME_DTO, TRANSFER_OUT_DTO], { page: 1, pageSize: 10, total: 21 }))
    const result = await api.listMovements({ page: 1, pageSize: 10 })
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(10)
    expect(result.total).toBe(21)
    expect(result.items).toEqual([
      {
        id: 'txn-1',
        accountId: 'acc-1',
        type: 'income',
        direction: null,
        amount: 85000000,
        currency: 'ARS',
        category: 'salary',
        description: 'Sueldo septiembre',
        status: 'completed',
        counterpartAccountId: null,
        createdAt: '2026-09-01T09:00:00Z',
      },
      {
        id: 'transfer-1-out',
        accountId: 'acc-1',
        type: 'transfer',
        direction: 'out',
        amount: 50000000,
        currency: 'ARS',
        category: 'transfer',
        description: 'Sueldo septiembre',
        status: 'pending',
        counterpartAccountId: 'acc-4',
        createdAt: '2026-09-01T09:00:00Z',
      },
    ])
  })

  it('accepts the failed status', async () => {
    const { api } = fakeClient(page([{ ...TRANSFER_OUT_DTO, status: 'failed' }]))
    const [movement] = (await api.listMovements({ page: 1, pageSize: 10 })).items
    expect(movement?.status).toBe('failed')
  })

  it('fills a missing category and description the way the API defaults them', async () => {
    const { api } = fakeClient(page([{ ...INCOME_DTO, category: null, description: null }]))
    const [movement] = (await api.listMovements({ page: 1, pageSize: 10 })).items
    expect(movement?.category).toBe('other')
    expect(movement?.description).toBe('')
  })

  it('ignores a direction on movements that are not transfers', async () => {
    const { api } = fakeClient(page([{ ...INCOME_DTO, direction: 'out' }]))
    const [movement] = (await api.listMovements({ page: 1, pageSize: 10 })).items
    expect(movement?.direction).toBeNull()
  })

  it.each([
    ['a non-numeric amount', { ...INCOME_DTO, amount: '850000' }],
    ['an infinite amount', { ...INCOME_DTO, amount: Number.POSITIVE_INFINITY }],
    ['a non-positive amount', { ...INCOME_DTO, amount: 0 }],
    ['an unknown currency', { ...INCOME_DTO, currency: 'BTC' }],
    ['an unknown type', { ...INCOME_DTO, type: 'refund' }],
    ['an unknown status', { ...INCOME_DTO, status: 'reversed' }],
    ['a transfer without direction', { ...TRANSFER_OUT_DTO, direction: null }],
    ['a transfer with an unknown direction', { ...TRANSFER_OUT_DTO, direction: 'sideways' }],
    ['a transfer without counterpart', { ...TRANSFER_OUT_DTO, counterpartAccountId: null }],
  ])('rejects a page with %s as server', async (_case, dto) => {
    const { api } = fakeClient(page([INCOME_DTO, dto]))
    expect((await rejection(api.listMovements({ page: 1, pageSize: 10 }))).kind).toBe('server')
  })

  it('rejects a response without pagination', async () => {
    const { api } = fakeClient({ transactions: [] })
    expect((await rejection(api.listMovements({ page: 1, pageSize: 10 }))).kind).toBe('server')
  })
})

describe('listPendingTransfers', () => {
  it('asks for one full page of pending transfers', async () => {
    const { api, request } = fakeClient(page([TRANSFER_OUT_DTO]))
    const pending = await api.listPendingTransfers()
    expect(request).toHaveBeenCalledWith('GET', '/transactions', {
      query: { type: 'transfer', status: 'pending', page: 1, pageSize: 50 },
    })
    expect(pending.map((movement) => movement.id)).toEqual(['transfer-1-out'])
  })
})

describe('createMovement', () => {
  it('sends the amount as the API decimal', async () => {
    const { api, request } = fakeClient({ transaction: { ...INCOME_DTO, type: 'expense', amount: 1234.56 } })
    const movement = await api.createMovement({
      accountId: 'acc-1',
      type: 'expense',
      amount: 123456,
      category: 'groceries',
      description: 'Supermercado',
    })
    expect(request).toHaveBeenCalledWith('POST', '/transactions', {
      body: {
        accountId: 'acc-1',
        type: 'expense',
        amount: 1234.56,
        category: 'groceries',
        description: 'Supermercado',
      },
    })
    expect(movement.amount).toBe(123456)
  })
})

describe('updateMovement', () => {
  it('patches category and description of the movement', async () => {
    const { api, request } = fakeClient({ transaction: { ...INCOME_DTO, category: 'other' } })
    const movement = await api.updateMovement('txn-1', { category: 'other', description: 'Sueldo' })
    expect(request).toHaveBeenCalledWith('PATCH', '/transactions/txn-1', {
      body: { category: 'other', description: 'Sueldo' },
    })
    expect(movement.category).toBe('other')
  })

  it('encodes the movement id in the path', async () => {
    const { api, request } = fakeClient({ transaction: INCOME_DTO })
    await api.updateMovement('a/b?c', { category: 'other', description: '' })
    expect(request.mock.calls[0]?.[1]).toBe('/transactions/a%2Fb%3Fc')
  })
})
