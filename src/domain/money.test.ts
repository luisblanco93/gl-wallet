import { describe, expect, it } from 'vitest'
import {
  formatMoney,
  formatSignedMoney,
  parseAmount,
  signedAmount,
  toApiAmount,
  toCents,
  totalsByCurrency,
} from './money'

const NBSP = ' '
const MINUS = '−'

describe('parseAmount', () => {
  it('parses a comma decimal into cents', () => {
    expect(parseAmount('1234,56')).toEqual({ ok: true, value: 123456 })
  })

  it('parses a dot decimal, one decimal and whole numbers', () => {
    expect(parseAmount('1234.56')).toEqual({ ok: true, value: 123456 })
    expect(parseAmount('10,5')).toEqual({ ok: true, value: 1050 })
    expect(parseAmount('500')).toEqual({ ok: true, value: 50000 })
  })

  it('builds cents from the text, without float errors', () => {
    expect(parseAmount('1,15')).toEqual({ ok: true, value: 115 })
    expect(parseAmount('0,07')).toEqual({ ok: true, value: 7 })
  })

  it('ignores surrounding whitespace', () => {
    expect(parseAmount('  20,00 ')).toEqual({ ok: true, value: 2000 })
  })

  it('accepts the minimum of 0.01', () => {
    expect(parseAmount('0,01')).toEqual({ ok: true, value: 1 })
  })

  it('reads a dot that groups digits in threes as the thousands separator (es-AR)', () => {
    expect(parseAmount('1.234,56')).toEqual({ ok: true, value: 123456 })
    expect(parseAmount('1.500')).toEqual({ ok: true, value: 150000 })
    expect(parseAmount('10.015')).toEqual({ ok: true, value: 1001500 })
    expect(parseAmount('1.234.567,89')).toEqual({ ok: true, value: 123456789 })
  })

  it('reads any other dot as the decimal separator', () => {
    expect(parseAmount('1.23')).toEqual({ ok: true, value: 123 })
    expect(parseAmount('0.50')).toEqual({ ok: true, value: 50 })
  })

  it('fails with tooManyDecimals for more than two decimals', () => {
    expect(parseAmount('10,015')).toEqual({ ok: false, error: 'tooManyDecimals' })
    expect(parseAmount('1234.567')).toEqual({ ok: false, error: 'tooManyDecimals' })
    expect(parseAmount('1.234,567')).toEqual({ ok: false, error: 'tooManyDecimals' })
  })

  it('does not treat a group starting with zero as thousands', () => {
    expect(parseAmount('0.001')).toEqual({ ok: false, error: 'tooManyDecimals' })
  })

  it('fails with empty for empty or blank input', () => {
    expect(parseAmount('')).toEqual({ ok: false, error: 'empty' })
    expect(parseAmount('   ')).toEqual({ ok: false, error: 'empty' })
  })

  it('fails with belowMinimum for zero', () => {
    expect(parseAmount('0')).toEqual({ ok: false, error: 'belowMinimum' })
    expect(parseAmount('0,00')).toEqual({ ok: false, error: 'belowMinimum' })
  })

  it('fails with invalid for negative or non-numeric input', () => {
    const inputs = ['-5', 'abc', '1,2,3', '1,', ',5', '1e3', '$ 10', '1.234.56', '12.34,5', '1,234.56', '1.2.3']
    for (const input of inputs) {
      expect(parseAmount(input)).toEqual({ ok: false, error: 'invalid' })
    }
  })

  it('fails with tooLarge when the amount is not a safe integer of cents', () => {
    expect(parseAmount('99999999999999999')).toEqual({ ok: false, error: 'tooLarge' })
  })
})

describe('toCents', () => {
  it('rounds a float balance to the nearest cent', () => {
    expect(toCents(0.30000000000000004)).toBe(30)
    expect(toCents(1234.56)).toBe(123456)
  })

  it('rounds half a cent up despite binary float error', () => {
    expect(toCents(1.005)).toBe(101)
  })

  it('keeps negative balances negative', () => {
    expect(toCents(-560)).toBe(-56000)
  })

  it('never returns negative zero', () => {
    expect(Object.is(toCents(-0.001), 0)).toBe(true)
    expect(Object.is(toCents(-0), 0)).toBe(true)
  })
})

describe('toApiAmount', () => {
  it('converts cents to the API decimal number', () => {
    expect(toApiAmount(123456)).toBe(1234.56)
    expect(toApiAmount(1)).toBe(0.01)
  })
})

describe('formatMoney', () => {
  it('formats ARS and USD with es-AR separators and the currency symbol', () => {
    expect(formatMoney(123456, 'ARS')).toBe(`$${NBSP}1.234,56`)
    expect(formatMoney(44000, 'USD')).toBe(`US$${NBSP}440,00`)
  })

  it('formats EUR with the euro sign', () => {
    expect(formatMoney(100, 'EUR')).toBe(`€${NBSP}1,00`)
  })

  it('uses the minus sign for negative amounts', () => {
    expect(formatMoney(-56000, 'USD')).toBe(`${MINUS}US$${NBSP}560,00`)
  })

  it('groups thousands and millions', () => {
    expect(formatMoney(85500000, 'ARS')).toBe(`$${NBSP}855.000,00`)
    expect(formatMoney(123456789, 'ARS')).toBe(`$${NBSP}1.234.567,89`)
  })

  it('formats small and zero amounts', () => {
    expect(formatMoney(5, 'ARS')).toBe(`$${NBSP}0,05`)
    expect(formatMoney(0, 'ARS')).toBe(`$${NBSP}0,00`)
    expect(formatMoney(-0, 'ARS')).toBe(`$${NBSP}0,00`)
  })
})

describe('formatSignedMoney', () => {
  it('prefixes incomes with a plus sign', () => {
    expect(formatSignedMoney(85000000, 'ARS')).toBe(`+$${NBSP}850.000,00`)
  })

  it('keeps the minus sign for debits and no sign for zero', () => {
    expect(formatSignedMoney(-2000000, 'ARS')).toBe(`${MINUS}$${NBSP}20.000,00`)
    expect(formatSignedMoney(0, 'USD')).toBe(`US$${NBSP}0,00`)
  })
})

describe('totalsByCurrency', () => {
  it('returns one total per currency and never a combined figure', () => {
    const totals = totalsByCurrency([
      { amount: 85500000, currency: 'ARS' },
      { amount: 44000, currency: 'USD' },
    ])
    expect(totals).toEqual([
      { currency: 'ARS', total: 85500000 },
      { currency: 'USD', total: 44000 },
    ])
  })

  it('adds amounts of the same currency, in order of first appearance', () => {
    const totals = totalsByCurrency([
      { amount: 100, currency: 'USD' },
      { amount: 1000, currency: 'ARS' },
      { amount: -30, currency: 'USD' },
    ])
    expect(totals).toEqual([
      { currency: 'USD', total: 70 },
      { currency: 'ARS', total: 1000 },
    ])
  })

  it('returns no totals for no items', () => {
    expect(totalsByCurrency([])).toEqual([])
  })
})

describe('signedAmount', () => {
  it('is negative for expenses and outgoing transfers', () => {
    expect(signedAmount({ type: 'expense', direction: null, amount: 500 })).toBe(-500)
    expect(signedAmount({ type: 'transfer', direction: 'out', amount: 500 })).toBe(-500)
  })

  it('is positive for incomes and incoming transfers', () => {
    expect(signedAmount({ type: 'income', direction: null, amount: 500 })).toBe(500)
    expect(signedAmount({ type: 'transfer', direction: 'in', amount: 500 })).toBe(500)
  })
})
