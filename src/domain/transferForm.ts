import type { Unknown } from './balances'
import { canTransferBetween, type CurrencyCheck } from './currency'
import { canDebit } from './funds'
import { parseAmount, type AmountError } from './money'
import type { Result } from './result'
import { MAX_DESCRIPTION_LENGTH, type Account, type Cents, type Currency } from './types'

/** An own account with the available amount the debit rule checks. */
export type TransferAccount = Pick<Account, 'id' | 'name' | 'currency'> & { readonly available: Cents | Unknown }

/** What the user has typed so far; nothing here is trusted until `validateTransfer` accepts it. */
export type TransferInput = {
  readonly sourceId: string
  readonly destination: { readonly kind: 'own' | 'p2p'; readonly accountId: string }
  readonly amountText: string
  readonly description: string
}

export type TransferDestination =
  | { readonly kind: 'own'; readonly account: TransferAccount }
  | { readonly kind: 'p2p'; readonly accountId: string }

/** A transfer that passed every client rule; amounts in cents. */
export type TransferDraft = {
  readonly source: TransferAccount
  readonly destination: TransferDestination
  readonly amount: Cents
  readonly description: string
}

export type DestinationProblem =
  | { readonly reason: 'required' }
  | { readonly reason: 'sameAsSource' }
  | { readonly reason: 'currencyMismatch'; readonly from: Currency; readonly to: Currency }

export type AmountProblem =
  | { readonly reason: 'invalid'; readonly error: AmountError }
  | { readonly reason: 'insufficient'; readonly available: Cents }
  | { readonly reason: 'unknownAvailable' }

/** Reason codes per field; `src/features` turns them into copy. */
export type TransferErrors = {
  readonly source?: { readonly reason: 'required' }
  readonly destination?: DestinationProblem
  readonly amount?: AmountProblem
  readonly description?: { readonly reason: 'tooLong'; readonly max: number }
}

export type OwnDestinationOption = { readonly account: TransferAccount; readonly check: CurrencyCheck }

/** "Mis cuentas": every own account except the source, each with whether it accepts the source's currency. */
export function ownDestinationOptions(
  source: TransferAccount,
  accounts: readonly TransferAccount[],
): readonly OwnDestinationOption[] {
  return accounts
    .filter((account) => account.id !== source.id)
    .map((account) => ({ account, check: canTransferBetween(source, account) }))
}

type FieldCheck<T, E> = { readonly value: T; readonly problem?: never } | { readonly value?: never; readonly problem: E }

/**
 * A P2P id that is one of the user's accounts follows the own-account rules,
 * so the P2P field cannot bypass the currency block.
 */
function checkDestination(
  input: TransferInput['destination'],
  source: TransferAccount | undefined,
  accounts: readonly TransferAccount[],
): FieldCheck<TransferDestination, DestinationProblem> {
  const accountId = input.accountId.trim()
  if (accountId === '') return { problem: { reason: 'required' } }
  if (accountId === source?.id) return { problem: { reason: 'sameAsSource' } }

  const own = accounts.find((account) => account.id === accountId)
  if (own === undefined) {
    return input.kind === 'own' ? { problem: { reason: 'required' } } : { value: { kind: 'p2p', accountId } }
  }

  const currency = source === undefined ? ({ ok: true } as const) : canTransferBetween(source, own)
  return currency.ok
    ? { value: { kind: 'own', account: own } }
    : { problem: { reason: 'currencyMismatch', from: currency.from, to: currency.to } }
}

function checkAmount(amountText: string, source: TransferAccount | undefined): FieldCheck<Cents, AmountProblem> {
  const amount = parseAmount(amountText)
  if (!amount.ok) return { problem: { reason: 'invalid', error: amount.error } }
  if (source === undefined) return { value: amount.value }

  const debit = canDebit(amount.value, source.available)
  if (debit.ok) return { value: amount.value }
  return {
    problem:
      debit.reason === 'insufficient'
        ? { reason: 'insufficient', available: debit.available }
        : { reason: 'unknownAvailable' },
  }
}

/** The transfer form's rules in one place: source, destination, currency, amount against available, description. */
export function validateTransfer(
  input: TransferInput,
  accounts: readonly TransferAccount[],
): Result<TransferDraft, TransferErrors> {
  const source = accounts.find((account) => account.id === input.sourceId)
  const destination = checkDestination(input.destination, source, accounts)
  const amount = checkAmount(input.amountText, source)
  const description = input.description.trim()
  const descriptionTooLong = description.length > MAX_DESCRIPTION_LENGTH

  if (source !== undefined && destination.value !== undefined && amount.value !== undefined && !descriptionTooLong) {
    return { ok: true, value: { source, destination: destination.value, amount: amount.value, description } }
  }

  return {
    ok: false,
    error: {
      ...(source === undefined && { source: { reason: 'required' } }),
      ...(destination.problem && { destination: destination.problem }),
      ...(amount.problem && { amount: amount.problem }),
      ...(descriptionTooLong && { description: { reason: 'tooLong', max: MAX_DESCRIPTION_LENGTH } }),
    },
  }
}
