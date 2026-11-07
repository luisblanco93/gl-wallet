import { ApiError } from '@/api/errors'
import type { AmountProblem, DestinationProblem, TransferDestination } from '@/domain/transferForm'
import type { Currency } from '@/domain/types'
import { BlockedError } from '@/features/blockedError'
import { amountMessage, debitBlockMessage } from '@/features/movements/newMovementForm'

export type DestinationKind = TransferDestination['kind']

/** The spec's reason for a destination in another currency. */
export function currencyReason(from: Currency, to: Currency): string {
  return `Moneda distinta: no se puede transferir entre ${from} y ${to}`
}

export function destinationMessage(problem: DestinationProblem, kind: DestinationKind): string {
  switch (problem.reason) {
    case 'required':
      return kind === 'own' ? 'Elige la cuenta de destino.' : 'Ingresa el ID de la cuenta destino.'
    case 'sameAsSource':
      return 'Es la misma cuenta de origen. Elige otra cuenta de destino.'
    case 'currencyMismatch':
      return `${currencyReason(problem.from, problem.to)}.`
  }
}

export function amountProblemMessage(problem: AmountProblem, currency: Currency): string {
  return problem.reason === 'invalid' ? amountMessage(problem.error, currency) : debitBlockMessage(problem, currency)
}

/**
 * What the screen does with a failed confirm. `form`: nothing was sent, back to Datos.
 * `unknown`: no trustworthy response, the transfer may exist.
 */
export type SendFailure =
  | { readonly kind: 'blocked'; readonly alert: string }
  | { readonly kind: 'form'; readonly alert: string }
  | { readonly kind: 'insufficient' }
  | { readonly kind: 'notFound' }
  | { readonly kind: 'unknown' }

export function sendFailure(error: Error): SendFailure {
  if (error instanceof BlockedError) {
    return {
      kind: 'blocked',
      alert: 'Tu disponible cambió desde la revisión y no enviamos la transferencia. Revisa el monto.',
    }
  }
  if (!(error instanceof ApiError)) return { kind: 'unknown' }
  switch (error.kind) {
    case 'insufficientFunds':
      return { kind: 'insufficient' }
    case 'notFound':
      return { kind: 'notFound' }
    case 'network':
    case 'server':
      return { kind: 'unknown' }
    default:
      return { kind: 'form', alert: 'No pudimos enviar la transferencia. Revisa los datos e inténtalo de nuevo.' }
  }
}
