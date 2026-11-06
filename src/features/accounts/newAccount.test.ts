import { describe, expect, it } from 'vitest'
import { validateNewAccount } from './newAccount'

describe('validateNewAccount', () => {
  it('accepts a name of 2 to 100 characters, trimmed', () => {
    expect(validateNewAccount({ name: '  Ahorro  ', currency: 'ARS' })).toEqual({
      ok: true,
      value: { name: 'Ahorro', currency: 'ARS' },
    })
    expect(validateNewAccount({ name: 'AB', currency: 'USD' }).ok).toBe(true)
    expect(validateNewAccount({ name: 'x'.repeat(100), currency: 'EUR' }).ok).toBe(true)
  })

  it('rejects a name shorter than 2 characters, ignoring surrounding spaces', () => {
    expect(validateNewAccount({ name: 'A', currency: 'ARS' })).toEqual({ ok: false, error: 'nameTooShort' })
    expect(validateNewAccount({ name: '  A  ', currency: 'ARS' })).toEqual({ ok: false, error: 'nameTooShort' })
  })

  it('rejects a name longer than 100 characters', () => {
    expect(validateNewAccount({ name: 'x'.repeat(101), currency: 'ARS' })).toEqual({ ok: false, error: 'nameTooLong' })
  })
})
