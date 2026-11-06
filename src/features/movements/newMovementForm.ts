import type { NewMovement } from '@/api/endpoints'
import { categoriesFor } from '@/domain/categories'
import { canDebit } from '@/domain/funds'
import { formatMoney, parseAmount, type AmountError } from '@/domain/money'
import type { Cents, Currency } from '@/domain/types'

export type MovementKind = 'income' | 'expense'
export type DraftField = 'accountId' | 'amount' | 'category'

/** What the user has typed so far; nothing here is trusted until `reviewDraft` accepts it. */
export type NewMovementDraft = {
  readonly type: MovementKind
  readonly accountId: string
  readonly amountText: string
  readonly category: string
  readonly description: string
}

export type DraftAccount = {
  readonly id: string
  readonly name: string
  readonly currency: Currency
  readonly available: Cents | 'unknown'
}

/** Why an expense cannot be sent from this account right now. */
export type DebitBlock =
  | { readonly reason: 'insufficient'; readonly available: Cents }
  | { readonly reason: 'unknownAvailable' }

export type DraftReview = {
  /** Ready to send; `null` while any field is missing, invalid or the debit rule blocks it. */
  readonly movement: NewMovement | null
  /** Every problem, shown once the user tries to submit. */
  readonly errors: Readonly<Partial<Record<DraftField, string>>>
  /** Shown while typing: an expense above (or with unknown) available. Submit stays disabled. */
  readonly debitBlock: DebitBlock | null
}

function amountMessage(error: AmountError, currency: Currency): string {
  switch (error) {
    case 'empty':
      return 'Ingresa un monto.'
    case 'tooManyDecimals':
      return 'Usa hasta 2 decimales, por ejemplo 1.500,50.'
    case 'belowMinimum':
      return `El monto mínimo es ${formatMoney(1, currency)}.`
    case 'tooLarge':
      return 'El monto es demasiado grande.'
    case 'invalid':
      return 'Ingresa un monto válido, por ejemplo 1.500,50.'
  }
}

/** The spec's copy: "Supera tu disponible de US$ 440,00". */
export function debitBlockMessage(block: DebitBlock, currency: Currency): string {
  return block.reason === 'insufficient'
    ? `Supera tu disponible de ${formatMoney(block.available, currency)}`
    : 'No pudimos calcular tu disponible en esta cuenta.'
}

function debitBlockOf(type: MovementKind, amount: Cents | null, account: DraftAccount | undefined): DebitBlock | null {
  if (type !== 'expense' || amount === null || account === undefined) return null
  const debit = canDebit(amount, account.available)
  if (debit.ok) return null
  return debit.reason === 'insufficient' ? { reason: 'insufficient', available: debit.available } : debit
}

/** Validates the draft with the domain rules: parsed amount, category for the type, debit rule for expenses. */
export function reviewDraft(draft: NewMovementDraft, account: DraftAccount | undefined): DraftReview {
  const currency = account?.currency ?? 'ARS'
  const amount = parseAmount(draft.amountText)
  const categoryOffered = (categoriesFor(draft.type) as readonly string[]).includes(draft.category)
  const debitBlock = debitBlockOf(draft.type, amount.ok ? amount.value : null, account)

  const errors: Partial<Record<DraftField, string>> = {
    ...(account === undefined && { accountId: 'Elige una cuenta.' }),
    ...(!amount.ok && { amount: amountMessage(amount.error, currency) }),
    ...(debitBlock && { amount: debitBlockMessage(debitBlock, currency) }),
    ...(!categoryOffered && { category: 'Elige una categoría.' }),
  }

  const movement =
    account !== undefined && amount.ok && categoryOffered && debitBlock === null
      ? {
          accountId: account.id,
          type: draft.type,
          amount: amount.value,
          category: draft.category,
          description: draft.description.trim(),
        }
      : null

  return { movement, errors, debitBlock }
}

/** Keeps the category only if the new type offers it. */
export function withType(draft: NewMovementDraft, type: MovementKind): NewMovementDraft {
  const offered = (categoriesFor(type) as readonly string[]).includes(draft.category)
  return { ...draft, type, category: offered ? draft.category : '' }
}
