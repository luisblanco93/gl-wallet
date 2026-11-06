import { describe, expect, it } from 'vitest'
import { hasFilters, readMovementList, toSearchParams, visibleRange, withFilters, withPage } from './filters'

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

describe('visibleRange', () => {
  it('gives the first and last row shown and the total', () => {
    expect(visibleRange(1, 10, 21)).toEqual({ from: 1, to: 10, total: 21 })
    expect(visibleRange(2, 10, 21)).toEqual({ from: 11, to: 20, total: 21 })
    expect(visibleRange(3, 10, 21)).toEqual({ from: 21, to: 21, total: 21 })
  })

  it('shows nothing when there are no rows or the page is past the end', () => {
    expect(visibleRange(1, 10, 0)).toEqual({ from: 0, to: 0, total: 0 })
    expect(visibleRange(9, 10, 21)).toEqual({ from: 0, to: 0, total: 21 })
  })
})

describe('hasFilters', () => {
  it('is false for the plain list on any page', () => {
    expect(hasFilters({ page: 1 })).toBe(false)
    expect(hasFilters({ page: 3 })).toBe(false)
  })

  it('is true when any filter or the search is set', () => {
    expect(hasFilters({ accountId: 'acc-1', page: 1 })).toBe(true)
    expect(hasFilters({ search: 'super', page: 1 })).toBe(true)
    expect(hasFilters({ status: 'pending', page: 1 })).toBe(true)
  })
})
