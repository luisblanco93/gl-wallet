import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { nextPoll, type PollDecision, type TrackingOutcome } from '@/domain/transferStatus'
import type { MovementStatus, Transfer } from '@/domain/types'
import { refreshMoneyQueries } from '@/features/refreshMoneyQueries'
import { useWalletApi } from '@/features/walletApi'

export const TRANSFER_KEY = ['transfer'] as const

export type TrackingPhase = 'processing' | TrackingOutcome

type Observation = { readonly status: MovementStatus; readonly dataUpdatedAt: number; readonly errorUpdatedAt: number }

/**
 * The one evaluation both the polling and the screen use. Elapsed time runs to the latest response,
 * successful or not, so an outage still reaches the 10 s cap instead of polling forever.
 */
function decide(observation: Observation, createdAtMs: number): PollDecision {
  const observedAt = Math.max(observation.dataUpdatedAt, observation.errorUpdatedAt)
  return nextPoll(observation.status, observedAt - createdAtMs)
}

/**
 * Tracks a transfer created by this client, seeded with the creation response. Only the status is
 * read from it: the P2P destination side is absent from status responses, so currency notices
 * come from the creation response instead.
 */
export function useTransferStatus(created: Transfer): TrackingPhase {
  const api = useWalletApi()
  const queryClient = useQueryClient()
  const createdAtMs = Date.parse(created.from.createdAt)

  const query = useQuery({
    queryKey: [...TRANSFER_KEY, created.id],
    queryFn: () => api.getTransfer(created.id),
    initialData: created,
    // A failed poll keeps the last status and the next tick tries again; the default backoff would break the 1 s cadence.
    retry: false,
    refetchInterval: ({ state }) => {
      const decision = decide({ ...state, status: state.data?.status ?? created.status }, createdAtMs)
      return decision.poll ? decision.inMs : false
    },
  })

  const decision = decide(
    { status: query.data.status, dataUpdatedAt: query.dataUpdatedAt, errorUpdatedAt: query.errorUpdatedAt },
    createdAtMs,
  )
  const phase: TrackingPhase = decision.poll ? 'processing' : decision.outcome

  // Settled or failed: balances, the pending amount and the movement list changed.
  useEffect(() => {
    if (phase === 'completed' || phase === 'failed') void refreshMoneyQueries(queryClient)
  }, [phase, queryClient])

  return phase
}
