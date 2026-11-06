import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Movement } from '@/domain/types'
import { useWalletApi } from '@/features/walletApi'
import { hasFilters, visibleRange, type MovementListState, type VisibleRange } from './filters'

export const MOVEMENTS_PAGE_SIZE = 10
export const MOVEMENTS_KEY = ['movements'] as const

/** Why the list is empty: nothing recorded yet, or nothing matches the filters. */
export type EmptyReason = 'noMovements' | 'noResults'

export type MovementsResult =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: unknown; readonly retry: () => void }
  | {
      readonly status: 'ready'
      readonly items: readonly Movement[]
      readonly range: VisibleRange
      readonly empty: EmptyReason | null
      /** A new page or filter is loading while the previous rows stay on screen. */
      readonly isUpdating: boolean
    }

/** One page of movements (newest first, as the API returns them) for the list state. */
export function useMovements(state: MovementListState): MovementsResult {
  const api = useWalletApi()
  const query = useQuery({
    queryKey: [...MOVEMENTS_KEY, state],
    queryFn: () => api.listMovements({ ...state, pageSize: MOVEMENTS_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  if (query.isPending) return { status: 'loading' }
  if (query.isError) return { status: 'error', error: query.error, retry: () => void query.refetch() }

  const { items, page, total } = query.data
  const empty = items.length > 0 ? null : hasFilters(state) ? 'noResults' : 'noMovements'
  return {
    status: 'ready',
    items,
    range: visibleRange(page, MOVEMENTS_PAGE_SIZE, total),
    empty,
    isUpdating: query.isPlaceholderData,
  }
}
