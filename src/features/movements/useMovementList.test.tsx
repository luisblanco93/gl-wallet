import { act, renderHook } from '@testing-library/react'
import { useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestProviders } from '@/test/providers'
import { SEARCH_DELAY_MS, useMovementList } from './useMovementList'

function renderAt(path: string) {
  const { wrapper } = createTestProviders({ initialPath: path })
  return renderHook(() => ({ list: useMovementList(), location: useLocation() }), { wrapper })
}

describe('useMovementList', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads the filters, the search and the page from the URL', () => {
    const { result } = renderAt('/movements?accountId=acc-1&search=super&page=2')
    expect(result.current.list.state).toEqual({ accountId: 'acc-1', search: 'super', page: 2 })
    expect(result.current.list.searchText).toBe('super')
  })

  it('writes a filter to the URL and goes back to page 1', () => {
    const { result } = renderAt('/movements?page=3')
    act(() => result.current.list.setFilters({ type: 'expense' }))
    expect(result.current.location.search).toBe('?type=expense')
    expect(result.current.list.state).toEqual({ type: 'expense', page: 1 })
  })

  it('changes the page keeping the filters', () => {
    const { result } = renderAt('/movements?type=income')
    act(() => result.current.list.setPage(2))
    expect(result.current.location.search).toBe('?type=income&page=2')
  })

  it(`writes the search to the URL only ${SEARCH_DELAY_MS} ms after the last keystroke, back on page 1`, () => {
    const { result } = renderAt('/movements?page=4')
    act(() => result.current.list.setSearchText('su'))
    act(() => vi.advanceTimersByTime(SEARCH_DELAY_MS - 1))
    act(() => result.current.list.setSearchText('super'))
    act(() => vi.advanceTimersByTime(SEARCH_DELAY_MS - 1))
    expect(result.current.list.searchText).toBe('super')
    expect(result.current.location.search).toBe('?page=4')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.location.search).toBe('?search=super')
    expect(result.current.list.state).toEqual({ search: 'super', page: 1 })
  })

  it('removes the search from the URL when the field is cleared', () => {
    const { result } = renderAt('/movements?search=super')
    act(() => result.current.list.setSearchText('  '))
    act(() => vi.advanceTimersByTime(SEARCH_DELAY_MS))
    expect(result.current.location.search).toBe('')
  })

  it('clears every filter and the search field', () => {
    const { result } = renderAt('/movements?type=expense&search=super&page=2')
    act(() => result.current.list.clearFilters())
    expect(result.current.location.search).toBe('')
    expect(result.current.list.searchText).toBe('')
  })
})
