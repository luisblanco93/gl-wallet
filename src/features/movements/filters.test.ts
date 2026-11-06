import { describe, expect, it } from 'vitest'
import { readMovementList, toSearchParams, withFilters, withPage } from './filters'

const DEFAULT = { page: 1 }

describe('readMovementList', () => {
  it('defaults to page 1 without filters', () => {
    expect(readMovementList(new URLSearchParams(''))).toEqual(DEFAULT)
  })

  it('reads every filter and the page', () => {
    const params = new URLSearchParams(
      'accountId=acc-1&type=expense&category=groceries&status=pending&search=super&page=3',
    )
    expect(readMovementList(params)).toEqual({
      accountId: 'acc-1',
      type: 'expense',
      category: 'groceries',
      status: 'pending',
      search: 'super',
      page: 3,
    })
  })

  it.each([
    ['an unknown type', 'type=xyz'],
    ['an unknown category', 'category=crypto'],
    ['an unknown status', 'status=reversed'],
    ['an empty account', 'accountId='],
    ['an empty search', 'search='],
  ])('drops %s', (_case, query) => {
    expect(readMovementList(new URLSearchParams(query))).toEqual(DEFAULT)
  })

  it.each([['0'], ['-2'], ['abc'], ['1.5'], ['']])('falls back to page 1 for page=%s', (page) => {
    expect(readMovementList(new URLSearchParams(`page=${page}`))).toEqual(DEFAULT)
  })
})

describe('toSearchParams', () => {
  it('writes only the filters that are set, and the page when it is not the first', () => {
    expect(toSearchParams({ accountId: 'acc-1', search: 'super', page: 2 }).toString()).toBe(
      'accountId=acc-1&search=super&page=2',
    )
    expect(toSearchParams({ type: 'income', page: 1 }).toString()).toBe('type=income')
  })

  it('round-trips through readMovementList', () => {
    const state = { accountId: 'acc-1', type: 'expense', status: 'completed', page: 4 } as const
    expect(readMovementList(toSearchParams(state))).toEqual(state)
  })
})

describe('withFilters', () => {
  it('resets to page 1 when a filter changes', () => {
    expect(withFilters({ accountId: 'acc-1', page: 5 }, { type: 'expense' })).toEqual({
      accountId: 'acc-1',
      type: 'expense',
      page: 1,
    })
  })

  it('removes a filter set to undefined', () => {
    expect(withFilters({ accountId: 'acc-1', search: 'x', page: 2 }, { search: undefined })).toEqual({
      accountId: 'acc-1',
      page: 1,
    })
  })
})

describe('withPage', () => {
  it('keeps the filters and changes the page', () => {
    expect(withPage({ type: 'income', page: 1 }, 3)).toEqual({ type: 'income', page: 3 })
  })
})
