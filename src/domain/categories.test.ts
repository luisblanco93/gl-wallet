import { describe, expect, it } from 'vitest'
import { CATEGORY_IDS, categoryLabel, selectableCategories } from './categories'

describe('categories', () => {
  it('knows the categories the API accepts', () => {
    expect(CATEGORY_IDS).toEqual([
      'salary',
      'freelance',
      'rent',
      'groceries',
      'transport',
      'entertainment',
      'utilities',
      'health',
      'transfer',
      'other',
    ])
  })

  it('does not let the user pick the transfer category', () => {
    expect(selectableCategories).not.toContain('transfer')
    expect(selectableCategories).toHaveLength(CATEGORY_IDS.length - 1)
  })

  it('labels categories in Spanish', () => {
    expect(categoryLabel('groceries')).toBe('Supermercado')
    expect(categoryLabel('other')).toBe('Otros')
    expect(categoryLabel('transfer')).toBe('Transferencia')
  })

  it('gives every category a distinct label', () => {
    const labels = CATEGORY_IDS.map(categoryLabel)
    expect(new Set(labels).size).toBe(CATEGORY_IDS.length)
  })

  it('falls back to the raw id for an unknown category', () => {
    expect(categoryLabel('crypto')).toBe('crypto')
  })
})
