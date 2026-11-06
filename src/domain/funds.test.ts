import { describe, expect, it } from 'vitest'
import { canDebit } from './funds'

const AVAILABLE = 22000000

describe('canDebit', () => {
  it('allows an amount within available', () => {
    expect(canDebit(10000000, AVAILABLE)).toEqual({ ok: true })
  })

  it('allows exactly the available amount', () => {
    expect(canDebit(AVAILABLE, AVAILABLE)).toEqual({ ok: true })
  })

  it('rejects an amount above available and reports the available amount', () => {
    expect(canDebit(30000000, AVAILABLE)).toEqual({
      ok: false,
      reason: 'insufficient',
      available: AVAILABLE,
    })
  })

  it('rejects any debit when available is negative', () => {
    expect(canDebit(1, -56000)).toEqual({ ok: false, reason: 'insufficient', available: -56000 })
  })

  it('blocks debits when available is unknown (fail closed)', () => {
    expect(canDebit(1, 'unknown')).toEqual({ ok: false, reason: 'unknownAvailable' })
  })
})
