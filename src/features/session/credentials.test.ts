import { describe, expect, it } from 'vitest'
import { validateCredentials } from './credentials'

describe('validateCredentials', () => {
  it('accepts a well-formed email and a password, trimming the email', () => {
    expect(validateCredentials('  demo@example.com ', 'demo123')).toEqual({
      ok: true,
      value: { email: 'demo@example.com', password: 'demo123' },
    })
  })

  it('requires both fields', () => {
    expect(validateCredentials('', '')).toEqual({ ok: false, error: { email: 'required', password: 'required' } })
    expect(validateCredentials('   ', 'x')).toEqual({ ok: false, error: { email: 'required' } })
  })

  it.each(['demo', 'demo@', '@example.com', 'demo@example', 'de mo@example.com'])(
    'rejects the malformed email %s',
    (email) => {
      expect(validateCredentials(email, 'demo123')).toEqual({ ok: false, error: { email: 'invalid' } })
    },
  )

  it('keeps the password as typed', () => {
    expect(validateCredentials('demo@example.com', ' secret ')).toEqual({
      ok: true,
      value: { email: 'demo@example.com', password: ' secret ' },
    })
  })
})
