import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'
import type { Movement } from '@/domain/types'
import { useWalletApi } from '@/features/walletApi'
import { MOVEMENTS_KEY } from './useMovements'

export type MovementResult =
  | { readonly status: 'loading' }
  | { readonly status: 'notFound' }
  | { readonly status: 'error'; readonly retry: () => void }
  | { readonly status: 'ready'; readonly movement: Movement }

/** One movement for the detail panel; under `['movements']`, so saving an edit refreshes it. */
export function useMovement(id: string): MovementResult {
  const api = useWalletApi()
  const query = useQuery({
    queryKey: [...MOVEMENTS_KEY, 'detail', id],
    queryFn: () => api.getMovement(id),
  })

  if (query.isPending) return { status: 'loading' }
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.kind === 'notFound') return { status: 'notFound' }
    return { status: 'error', retry: () => void query.refetch() }
  }
  return { status: 'ready', movement: query.data }
}
