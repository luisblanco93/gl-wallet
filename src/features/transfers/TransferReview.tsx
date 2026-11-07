import { Link } from 'react-router'
import { formatMoney } from '@/domain/money'
import type { TransferDraft } from '@/domain/transferForm'
import { CURRENCY_NAMES } from '@/features/accounts/accountView'
import { Button } from '@/shared/ui/Button'
import { Alert } from '@/shared/ui/Feedback'
import { cx } from '@/shared/ui/cx'
import { FIELD_IDS } from './transferFields'

export const REVIEW_HEADING_ID = 'transfer-review-title'

type ReviewRow = {
  readonly label: string
  readonly value: string
  readonly sub?: string
  readonly isAmount?: boolean
  /** The Datos field "Editar" goes back to. */
  readonly field: string
  readonly editLabel: string
}

function reviewRows(draft: TransferDraft, sourceAvailable: string | null, remaining: string | null): ReviewRow[] {
  const { source, destination, amount, description } = draft
  const destinationRow: ReviewRow =
    destination.kind === 'own'
      ? {
          label: 'Para',
          value: `${destination.account.name} (${destination.account.currency}) · tu cuenta`,
          field: FIELD_IDS.own,
          editLabel: 'Editar la cuenta destino',
        }
      : {
          label: 'Para',
          value: `${destination.accountId} · otra persona`,
          sub: 'No podemos mostrar el nombre del titular.',
          field: FIELD_IDS.p2p,
          editLabel: 'Editar el ID de la cuenta destino',
        }
  return [
    {
      label: 'Desde',
      value: source.name,
      sub: sourceAvailable ? `Disponible: ${sourceAvailable}` : undefined,
      field: FIELD_IDS.source,
      editLabel: 'Editar la cuenta de origen',
    },
    destinationRow,
    {
      label: 'Monto',
      value: formatMoney(amount, source.currency),
      sub: remaining ?? undefined,
      isAmount: true,
      field: FIELD_IDS.amount,
      editLabel: 'Editar el monto',
    },
    ...(description === ''
      ? []
      : [{ label: 'Descripción', value: description, field: FIELD_IDS.description, editLabel: 'Editar la descripción' }]),
  ]
}

/**
 * Revisión: everything that will be sent, with the P2P warnings. `available` is the source's current
 * figure (it may have changed since Datos); the confirm handler re-checks it before sending.
 */
export function TransferReview({
  draft,
  available,
  isSending,
  isBlockedByOtherSend,
  isRetryAfterUnknown,
  onConfirm,
  onEdit,
  onBack,
}: {
  draft: TransferDraft
  available: number | 'unknown'
  isSending: boolean
  /** A transfer sent before this screen mounted is still in flight. */
  isBlockedByOtherSend: boolean
  /** Back from "No pudimos confirmar el envío": a second confirm could pay twice. */
  isRetryAfterUnknown: boolean
  onConfirm: () => void
  onEdit: (field: string) => void
  onBack: () => void
}) {
  const { source, destination, amount } = draft
  const amountLabel = formatMoney(amount, source.currency)
  const sourceAvailable = available === 'unknown' ? null : formatMoney(available, source.currency)
  const remaining =
    available === 'unknown' || available < amount ? null : `Te quedarán ${formatMoney(available - amount, source.currency)} disponibles.`

  return (
    <section
      aria-labelledby={REVIEW_HEADING_ID}
      aria-busy={isSending}
      className="flex max-w-[42.5rem] flex-col gap-4.5 rounded-xl border-[1.5px] border-info-border bg-paper p-5 md:p-8"
    >
      <h2 id={REVIEW_HEADING_ID} tabIndex={-1} className="text-title outline-none">
        Revisa antes de confirmar
      </h2>
      <dl className="flex flex-col">
        {reviewRows(draft, sourceAvailable, remaining).map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line py-3.5">
            <div className="min-w-0">
              <dt className="text-sm text-ink-muted">{row.label}</dt>
              <dd className={cx('mt-0.5 font-bold money-wrap', row.isAmount ? 'text-[1.75rem] money' : 'text-base')}>{row.value}</dd>
              {row.sub && <dd className="mt-0.5 text-sm text-ink-soft">{row.sub}</dd>}
            </div>
            <Button variant="ghost" size="md" disabled={isSending} aria-label={row.editLabel} onClick={() => onEdit(row.field)}>
              Editar
            </Button>
          </div>
        ))}
      </dl>
      {destination.kind === 'p2p' && (
        <>
          <Alert tone="warning" role="note" title="Revisa el ID: las transferencias no se pueden revertir">
            Vas a enviar {amountLabel} a {destination.accountId}. Si el ID es incorrecto, no podremos recuperar el dinero.
          </Alert>
          <Alert tone="warning" role="note" title={`La cuenta destino debe estar en ${source.currency}`}>
            No podemos ver la moneda de una cuenta ajena. Si está en otra moneda, recibirá el mismo número sin
            conversión, no el equivalente en {CURRENCY_NAMES[source.currency].toLowerCase()}.
          </Alert>
        </>
      )}
      {isRetryAfterUnknown && (
        <Alert tone="warning" title="Tu envío anterior pudo haberse registrado">
          <span>
            Antes de confirmar, revisa Movimientos. Si la transferencia aparece como Pendiente o Completada, no la
            envíes de nuevo: pagarías dos veces.
          </span>
          <Link to="/movimientos" className="font-bold underline underline-offset-3">
            Revisar Movimientos
          </Link>
        </Alert>
      )}
      {isBlockedByOtherSend && (
        <Alert tone="pending" title="Todavía estamos enviando una transferencia anterior">
          Espera a que termine y revisa su estado en Movimientos antes de enviar otra.
        </Alert>
      )}
      <p className="text-sm text-ink-soft">Al confirmar, el monto se descuenta de tu disponible de inmediato.</p>
      <div className="flex flex-wrap gap-2.5">
        <Button
          className="min-h-13 tabular-nums"
          loading={isSending}
          loadingLabel="Enviando transferencia…"
          disabled={isBlockedByOtherSend}
          onClick={onConfirm}
        >
          Confirmar y transferir {amountLabel}
        </Button>
        <Button variant="secondary" disabled={isSending} onClick={onBack}>
          Volver
        </Button>
      </div>
      {isSending && (
        <p role="status" className="text-sm font-semibold text-ink-soft">
          Estamos enviando tu transferencia. No cierres esta pantalla; el botón queda bloqueado para evitar un envío doble.
        </p>
      )}
    </section>
  )
}
