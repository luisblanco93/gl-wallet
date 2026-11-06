import { describe, expect, it } from 'vitest'
import { canTransferBetween } from './currency'

describe('canTransferBetween', () => {
  it('allows a transfer between accounts in the same currency', () => {
    expect(canTransferBetween({ currency: 'ARS' }, { currency: 'ARS' })).toEqual({ ok: true })
  })

  it('blocks a transfer between currencies, naming both', () => {
    expect(canTransferBetween({ currency: 'ARS' }, { currency: 'USD' })).toEqual({
      ok: false,
      reason: 'currencyMismatch',
      from: 'ARS',
      to: 'USD',
    })
  })
})
