export type Currency = 'ARS' | 'USD' | 'EUR'

/** Integer number of cents. API decimals are converted only in `src/api` (see `toCents` / `toApiAmount`). */
export type Cents = number

export type MovementType = 'income' | 'expense' | 'transfer'
export type TransferDirection = 'in' | 'out'
export type MovementStatus = 'pending' | 'completed'

/** Only the fields domain rules read; the API DTO stays in `src/api`. */
export type Movement = {
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
}

export type Account = {
  readonly id: string
  readonly name: string
  readonly currency: Currency
  /** Settled balance as reported by the API (completed movements only). */
  readonly balance: Cents
}
