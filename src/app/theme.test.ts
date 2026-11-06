import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTheme, setTheme } from './theme'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('theme preference', () => {
  it('defaults to Bosque y marfil without a saved preference', () => {
    expect(getTheme()).toBe('bosque')
  })

  it('restores either supported saved theme', () => {
    for (const theme of ['bosque', 'azul']) {
      localStorage.setItem('greelow-theme', theme)
      expect(getTheme()).toBe(theme)
    }
  })

  it('falls back to Bosque y marfil for an unsupported stored value', () => {
    localStorage.setItem('greelow-theme', 'unexpected-theme')
    expect(getTheme()).toBe('bosque')
  })

  it('defaults safely when reading browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError')
    })
    expect(getTheme()).toBe('bosque')
  })

  it('applies and remembers the selected theme', () => {
    setTheme('azul')
    expect(document.documentElement).toHaveAttribute('data-theme', 'azul')
    expect(localStorage.getItem('greelow-theme')).toBe('azul')
  })

  it('still applies the theme when the preference cannot be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is full', 'QuotaExceededError')
    })
    expect(() => setTheme('azul')).not.toThrow()
    expect(document.documentElement).toHaveAttribute('data-theme', 'azul')
  })
})
