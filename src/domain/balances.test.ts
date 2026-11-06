import { describe, expect, it } from 'vitest'
import { accountFigures, availableAfter } from './balances'
import type { Movement } from './types'

const ANA = { id: 'acc-ana', balance: 72000000 }

function transfer(overrides: Partial<Movement> = {}): Movement {
  return {
    id: 'transfer-1-out',
    accountId: ANA.id,
    type: 'transfer',
    direction: 'out',
    amount: 50000000,
    currency: 'ARS',
    category: 'transfer',
    status: 'pending',
    counterpartAccountId: 'acc-4',
    transferId: null,
    description: '',
    createdAt: '2026-11-06T12:00:00.000Z',
    ...overrides,
  }
}

describe('accountFigures', () => {
  it('makes available equal to the balance when nothing is pending', () => {
    expect(accountFigures({ id: 'acc-1', balance: 85500000 }, [])).toEqual({
      settled: 85500000,
      inProgress: 0,
      available: 85500000,
    })
  })

  it('subtracts a pending outgoing transfer from available', () => {
    expect(accountFigures(ANA, [transfer()])).toEqual({
      settled: 72000000,
      inProgress: 50000000,
      available: 22000000,
    })
  })

  it('adds up several pending outgoing transfers', () => {
    const figures = accountFigures(ANA, [transfer(), transfer({ amount: 10000000 })])
    expect(figures).toEqual({ settled: 72000000, inProgress: 60000000, available: 12000000 })
  })

  it('can make available negative, as the API allows double spending while pending', () => {
    const figures = accountFigures(ANA, [transfer(), transfer()])
    expect(figures.available).toBe(-28000000)
  })

  it('ignores incoming, completed, failed, other-account and non-transfer movements', () => {
    const ignored = [
      transfer({ direction: 'in' }),
      transfer({ status: 'completed' }),
      transfer({ status: 'failed' }),
      transfer({ accountId: 'acc-other' }),
      transfer({ type: 'expense', direction: null, counterpartAccountId: null }),
    ]
    expect(accountFigures(ANA, ignored)).toEqual({
      settled: 72000000,
      inProgress: 0,
      available: 72000000,
    })
  })

  it('keeps a negative settled balance as is', () => {
    expect(accountFigures({ id: 'acc-usd', balance: -56000 }, []).available).toBe(-56000)
  })

  it('marks in progress and available as unknown when pending transfers could not be loaded', () => {
    expect(accountFigures(ANA, 'unknown')).toEqual({
      settled: 72000000,
      inProgress: 'unknown',
      available: 'unknown',
    })
  })
})

describe('availableAfter', () => {
  it('lowers the available by an expense and raises it by an income', () => {
    expect(availableAfter(85500000, { type: 'expense', direction: null, amount: 5200000 })).toBe(80300000)
    expect(availableAfter(85500000, { type: 'income', direction: null, amount: 100 })).toBe(85500100)
  })

  it('stays unknown when the available was unknown', () => {
    expect(availableAfter('unknown', { type: 'income', direction: null, amount: 100 })).toBe('unknown')
  })
})
