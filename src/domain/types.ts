export type Currency = 'ARS' | 'USD' | 'EUR'

/** Integer number of cents. API decimals are converted only in `src/api` (see `toCents` / `toApiAmount`). */
export type Cents = number

export type MovementType = 'income' | 'expense' | 'transfer'
export type TransferDirection = 'in' | 'out'
/** `failed` is allowed by the API schema but produced by no current flow; it never counts as in progress. */
export type MovementStatus = 'pending' | 'completed' | 'failed'

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
