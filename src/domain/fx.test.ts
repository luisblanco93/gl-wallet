import { describe, expect, it } from 'vitest'
import { convert, estimatedTotalArs, referenceRate, type FxRates } from './fx'

const rates: FxRates = { arsPerUsd: 1545, arsPerEur: 1731, updatedAt: '2026-11-05T17:49:00.000Z' }

describe('referenceRate', () => {
  it('is the average of buy and sell', () => {
    expect(referenceRate(1520, 1570)).toBe(1545)
  })
})

describe('convert', () => {
  it('converts ARS to USD, rounded to the cent', () => {
    expect(convert(10_000_000, 'ARS', 'USD', rates)).toBe(6_472)
  })

  it('converts USD to EUR through ARS', () => {
    expect(convert(10_000, 'USD', 'EUR', rates)).toBe(8_925)
  })

  it('rounds once at the end, not the intermediate ARS amount', () => {
    // US$ 0,01 → 1,45 ARS cents → € 0,0052 → 1 cent. Rounding the ARS cents first gives 1 → 0.
    expect(convert(1, 'USD', 'EUR', { ...rates, arsPerUsd: 1.45, arsPerEur: 2.8 })).toBe(1)
  })
})

describe('estimatedTotalArs', () => {
  it('adds every available amount converted to ARS', () => {
    const accounts = [
      { currency: 'ARS', available: 85_500_000 },
      { currency: 'USD', available: 44_000 },
    ] as const
    expect(estimatedTotalArs(accounts, rates)).toBe(153_480_000)
  })

  it('is unknown while any available amount is unknown', () => {
    const accounts = [
      { currency: 'ARS', available: 85_500_000 },
      { currency: 'USD', available: 'unknown' },
    ] as const
    expect(estimatedTotalArs(accounts, rates)).toBe('unknown')
  })
})
