import { describe, expect, it } from 'vitest'
import { editBlockReason, editableFields } from './editability'

describe('editableFields', () => {
  it('allows only category and description for incomes and expenses', () => {
    expect(editableFields({ type: 'income' })).toEqual(['category', 'description'])
    expect(editableFields({ type: 'expense' })).toEqual(['category', 'description'])
  })

  it('allows nothing for transfers', () => {
    expect(editableFields({ type: 'transfer' })).toEqual([])
  })
})

describe('editBlockReason', () => {
  it('explains that transfers cannot be modified', () => {
    expect(editBlockReason({ type: 'transfer' })).toBe('transferNotEditable')
  })

  it('has no reason for incomes and expenses', () => {
    expect(editBlockReason({ type: 'income' })).toBeNull()
    expect(editBlockReason({ type: 'expense' })).toBeNull()
  })
})
