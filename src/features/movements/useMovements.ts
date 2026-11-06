import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { TRANSFER_POLL_INTERVAL_MS, listShouldRefresh } from '@/domain/transferStatus'
import type { Movement } from '@/domain/types'
import { useWalletApi } from '@/features/walletApi'
import { hasFilters, pageCount, visibleRange, type MovementListState, type VisibleRange } from './filters'

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
      readonly page: number
      readonly pageCount: number
      /** Set only when nothing matches at all; a page past the end is not empty, just out of range. */
      readonly empty: EmptyReason | null
      /** A new page or filter is loading while the previous rows stay on screen. */
      readonly isUpdating: boolean
    }

/** One page of movements (newest first, as the API returns them) for the list state. */
export function useMovements(state: MovementListState, pageSize: number = MOVEMENTS_PAGE_SIZE): MovementsResult {
  const api = useWalletApi()
  const query = useQuery({
    queryKey: [...MOVEMENTS_KEY, state, pageSize],
    queryFn: () => api.listMovements({ ...state, pageSize }),
    placeholderData: keepPreviousData,
    // A pending row settles without notice: refresh while one is newer than the cap, then stop.
    refetchInterval: ({ state }) => {
      const pendingCreatedAts = (state.data?.items ?? [])
        .filter((movement) => movement.status === 'pending')
        .map((movement) => movement.createdAt)
      return listShouldRefresh(pendingCreatedAts, Date.now()) ? TRANSFER_POLL_INTERVAL_MS : false
    },
  })

  if (query.isPending) return { status: 'loading' }
  if (query.isError) return { status: 'error', error: query.error, retry: () => void query.refetch() }

  const { items, page, total } = query.data
  const empty = total > 0 ? null : hasFilters(state) ? 'noResults' : 'noMovements'
  return {
    status: 'ready',
    items,
    range: visibleRange(page, pageSize, total),
    page,
    pageCount: pageCount(total, pageSize),
    empty,
    isUpdating: query.isPlaceholderData,
  }
}
