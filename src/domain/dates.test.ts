import { describe, expect, it } from 'vitest'
import { formatDate } from './dates'

describe('formatDate', () => {
  it('formats in Buenos Aires time with a lowercase three-letter month and 24 h', () => {
    expect(formatDate('2026-11-05T17:30:00Z')).toBe('5 nov 2026, 14:30')
  })

  it('pads minutes and shows midnight as 00', () => {
    expect(formatDate('2026-01-01T03:05:00Z')).toBe('1 ene 2026, 00:05')
  })

  it('uses the local date, which can differ from the UTC date', () => {
    expect(formatDate('2026-09-01T02:00:00Z')).toBe('31 ago 2026, 23:00')
  })
})
