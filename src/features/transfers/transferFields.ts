import type { TransferInput } from '@/domain/transferForm'
import type { DestinationKind } from './transferCopy'

/** What the user has typed; own and P2P destinations are kept apart so switching tabs loses nothing. */
export type TransferFormValues = {
  readonly sourceId: string
  readonly tab: DestinationKind
  readonly ownId: string
  readonly p2pId: string
  readonly amountText: string
  readonly description: string
}

/** Datos fields that "Editar" and "Corregir" go back to (each takes focus). */
export const FIELD_IDS = {
  source: 'transfer-source',
  own: 'transfer-own',
  p2p: 'transfer-p2p-id',
  amount: 'transfer-amount',
  description: 'transfer-description',
} as const

/** The alert of a problem reported after a confirm; it takes focus when the form comes back. */
export const FORM_ALERT_ID = 'transfer-form-alert'

export function toTransferInput(values: TransferFormValues): TransferInput {
  return {
    sourceId: values.sourceId,
    destination: { kind: values.tab, accountId: values.tab === 'own' ? values.ownId : values.p2pId },
    amountText: values.amountText,
    description: values.description,
  }
}
