import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeSelect } from './ThemeSelect'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('ThemeSelect', () => {
  it('offers the two named themes, restores the preference and accepts keyboard focus', async () => {
    localStorage.setItem('greelow-theme', 'azul')
    render(<ThemeSelect />)

    const select = screen.getByRole('combobox', { name: 'Tema' })
    expect(select).toHaveValue('azul')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Bosque y marfil',
      'Azul y porcelana',
    ])
    await userEvent.tab()
    expect(select).toHaveFocus()
  })

  it('switches and remembers either theme without remounting the page', async () => {
    render(<ThemeSelect />)
    const select = screen.getByRole('combobox', { name: 'Tema' })
    expect(select).toHaveValue('bosque')

    for (const theme of ['azul', 'bosque']) {
      await userEvent.selectOptions(select, theme)
      expect(select).toHaveValue(theme)
      expect(document.documentElement).toHaveAttribute('data-theme', theme)
      expect(localStorage.getItem('greelow-theme')).toBe(theme)
      expect(screen.getByRole('combobox', { name: 'Tema' })).toBe(select)
    }
  })

  it('keeps the selector aligned after remounting when saving is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError')
    })
    const { unmount } = render(<ThemeSelect />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tema' }), 'azul')
    unmount()
    render(<ThemeSelect />)
    expect(screen.getByRole('combobox', { name: 'Tema' })).toHaveValue('azul')
    expect(document.documentElement).toHaveAttribute('data-theme', 'azul')
  })
})
