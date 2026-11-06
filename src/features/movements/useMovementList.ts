import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { MovementFilters } from '@/api/endpoints'
import { readMovementList, toSearchParams, withFilters, withPage, type MovementListState } from './filters'

export const SEARCH_DELAY_MS = 300

function committedSearch(text: string): string | undefined {
  return text.trim() === '' ? undefined : text
}

/**
 * Filters, search and page of the movement list, kept in the URL. The search field has
 * its own text, written to the URL `SEARCH_DELAY_MS` after the last keystroke, so the
 * URL and the query only ever hold the committed search.
 */
export function useMovementList() {
  const [params, setParams] = useSearchParams()
  const state = readMovementList(params)
  const urlSearch = state.search ?? ''

  const [searchText, setSearchText] = useState(urlSearch)
  // Follow the URL when it changes from outside (back button, "Limpiar filtros").
  const [syncedSearch, setSyncedSearch] = useState(urlSearch)
  if (syncedSearch !== urlSearch) {
    setSyncedSearch(urlSearch)
    setSearchText(urlSearch)
  }

  useEffect(() => {
    const search = committedSearch(searchText)
    if (search === state.search) return
    const timer = setTimeout(() => {
      setParams((current) => toSearchParams(withFilters(readMovementList(current), { search })))
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [searchText, state.search, setParams])

  const update = (next: (current: MovementListState) => MovementListState) =>
    setParams((current) => toSearchParams(next(readMovementList(current))))

  return {
    state,
    searchText,
    setSearchText,
    setFilters: (changes: Partial<Omit<MovementFilters, 'search'>>) => update((current) => withFilters(current, changes)),
    setPage: (page: number) => update((current) => withPage(current, page)),
    clearFilters: () => {
      setSearchText('')
      setParams(new URLSearchParams())
    },
  }
}
