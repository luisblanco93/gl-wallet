import type { MovementStatus } from './types'

/** The API settles a transfer about 1.5 s after creating it and never notifies: the client asks every second. */
export const TRANSFER_POLL_INTERVAL_MS = 1000
/** A transfer still pending this long after creation is reported as delayed and no longer polled (e.g. server restarted). */
export const TRANSFER_POLL_MAX_MS = 10_000

export type TrackingOutcome = 'completed' | 'delayed' | 'failed'

export type PollDecision =
  | { readonly poll: true; readonly inMs: number }
  | { readonly poll: false; readonly outcome: TrackingOutcome }

/**
 * The cap bounds the age on both sides: a creation time far in the future (server clock ahead,
 * or untrustworthy data) stops polling as well. An unreadable time (NaN) is never within it.
 */
function isWithinPollWindow(ageMs: number): boolean {
  return Math.abs(ageMs) < TRANSFER_POLL_MAX_MS
}

/**
 * Whether to ask for the transfer status again. `status` is the last one the client saw,
 * so a failed status request before the cap simply keeps polling.
 */
export function nextPoll(status: MovementStatus, elapsedMs: number): PollDecision {
  if (status === 'completed') return { poll: false, outcome: 'completed' }
  if (status === 'failed') return { poll: false, outcome: 'failed' }
  if (!isWithinPollWindow(elapsedMs)) return { poll: false, outcome: 'delayed' }
  return { poll: true, inMs: TRANSFER_POLL_INTERVAL_MS }
}

/**
 * The movement list refreshes while it shows a pending row younger than the cap, counted from
 * the newest one, so a stuck `pending` row cannot cause endless polling. Unparseable dates never refresh.
 */
export function listShouldRefresh(pendingCreatedAts: readonly string[], nowMs: number): boolean {
  if (pendingCreatedAts.length === 0) return false
  const newest = Math.max(...pendingCreatedAts.map((createdAt) => Date.parse(createdAt)))
  return isWithinPollWindow(nowMs - newest)
}
