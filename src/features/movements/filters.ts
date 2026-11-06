import type { MovementFilters } from '@/api/endpoints'
import { CATEGORY_IDS } from '@/domain/categories'
import { MOVEMENT_STATUSES, MOVEMENT_TYPES } from '@/domain/types'

/** Filters and page of the movement list, as kept in the URL query string. */
export type MovementListState = MovementFilters & { readonly page: number }

const FIRST_PAGE = 1
const PAGE_PATTERN = /^[1-9]\d*$/

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((option) => option === value)
}

function nonEmpty(value: string | null): string | undefined {
  return value === null || value === '' ? undefined : value
}

function readPage(value: string | null): number {
  if (value === null || !PAGE_PATTERN.test(value)) return FIRST_PAGE
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : FIRST_PAGE
}

/** Drops keys whose value is `undefined`, so an unset filter is absent rather than present. */
function withoutUnset(state: MovementListState): MovementListState {
  return Object.fromEntries(
    Object.entries(state).filter(([, value]) => value !== undefined),
  ) as MovementListState
}

/** Unknown or malformed values fall back to their defaults (no filter, page 1). */
export function readMovementList(params: URLSearchParams): MovementListState {
  return withoutUnset({
    accountId: nonEmpty(params.get('accountId')),
    type: oneOf(params.get('type'), MOVEMENT_TYPES),
    category: oneOf(params.get('category'), CATEGORY_IDS),
    status: oneOf(params.get('status'), MOVEMENT_STATUSES),
    search: nonEmpty(params.get('search')),
    page: readPage(params.get('page')),
  })
}

/** Only set filters are written; the first page is implied. */
export function toSearchParams(state: MovementListState): URLSearchParams {
  const params = new URLSearchParams()
  const { accountId, type, category, status, search, page } = state
  for (const [key, value] of Object.entries({ accountId, type, category, status, search })) {
    if (value !== undefined && value !== '') params.set(key, value)
  }
  if (page !== FIRST_PAGE) params.set('page', String(page))
  return params
}

/** Changing any filter or the search goes back to page 1. */
export function withFilters(state: MovementListState, changes: Partial<MovementFilters>): MovementListState {
  return withoutUnset({ ...state, ...changes, page: FIRST_PAGE })
}

export function withPage(state: MovementListState, page: number): MovementListState {
  return { ...state, page }
}

/** Whether any filter or the search narrows the list (the page does not). */
export function hasFilters(state: MovementListState): boolean {
  const { accountId, type, category, status, search } = state
  return [accountId, type, category, status, search].some((value) => value !== undefined)
}

export type VisibleRange = { readonly from: number; readonly to: number; readonly total: number }

/** Rows shown for "Mostrando X–Y de N"; `0–0` when the page has no rows. */
export function visibleRange(page: number, pageSize: number, total: number): VisibleRange {
  const from = (page - 1) * pageSize + 1
  if (from > total) return { from: 0, to: 0, total }
  return { from, to: Math.min(page * pageSize, total), total }
}
