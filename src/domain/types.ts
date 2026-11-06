export const CURRENCIES = ['ARS', 'USD', 'EUR'] as const
export type Currency = (typeof CURRENCIES)[number]

/** Integer number of cents. API decimals are converted only in `src/api` (see `toCents` / `toApiAmount`). */
export type Cents = number

export const MOVEMENT_TYPES = ['income', 'expense', 'transfer'] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]
export const TRANSFER_DIRECTIONS = ['in', 'out'] as const
export type TransferDirection = (typeof TRANSFER_DIRECTIONS)[number]
/** `failed` is allowed by the API schema but produced by no current flow; it never counts as in progress. */
export const MOVEMENT_STATUSES = ['pending', 'completed', 'failed'] as const
export type MovementStatus = (typeof MOVEMENT_STATUSES)[number]

/** Fields domain rules read plus the display fields rows need; the API DTO stays in `src/api`. */
export type Movement = {
  readonly id: string
  readonly accountId: string
  readonly type: MovementType
  /** Set only for transfers. */
  readonly direction: TransferDirection | null
  /** Always positive; the sign comes from `type` and `direction` (see `signedAmount`). */
  readonly amount: Cents
  readonly currency: Currency
  readonly category: string
  readonly status: MovementStatus
  /** Set only for transfers: the other side's account id. */
  readonly counterpartAccountId: string | null
  readonly description: string
  /** ISO 8601 timestamp. */
  readonly createdAt: string
}

export type Account = {
  readonly id: string
  readonly name: string
  readonly currency: Currency
  /** Settled balance as reported by the API (completed movements only). */
  readonly balance: Cents
}

export type User = {
  readonly id: string
  readonly email: string
  readonly name: string
}
