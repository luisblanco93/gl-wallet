import { Check, Clock, Hourglass, SearchX, Wallet, WifiOff, X, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { canTransferBetween } from '@/domain/currency'
import { formatMoney } from '@/domain/money'
import type { TransferDraft } from '@/domain/transferForm'
import type { Cents, Transfer } from '@/domain/types'
import { Button } from '@/shared/ui/Button'
import { Alert } from '@/shared/ui/Feedback'
import { Icon } from '@/shared/ui/Icon'
import { StatusTimeline, type StepState } from '@/shared/ui/Steps'
import { cx } from '@/shared/ui/cx'
import { useTransferStatus, type TrackingPhase } from './useTransferStatus'

export const RESULT_HEADING_ID = 'transfer-result-title'

/** What the confirm produced; validation problems never get here (they go back to Datos). */
export type TransferOutcome =
  | { readonly kind: 'created'; readonly transfer: Transfer }
  | { readonly kind: 'insufficient' }
  | { readonly kind: 'notFound' }
  | { readonly kind: 'unknown' }

type Tone = 'pending' | 'success' | 'warning' | 'error'
type Action = { readonly label: string; readonly onClick: () => void }
type Fact = { readonly label: string; readonly value: string }

const TONES: Readonly<Record<Tone, string>> = {
  pending: 'bg-pending-bg text-pending border-[1.5px] border-dashed border-pending-border',
  success: 'bg-success-bg text-success border-[1.5px] border-success-border',
  warning: 'bg-warning-bg text-warning border-[1.5px] border-warning-border',
  error: 'bg-error-bg text-error-strong border-[1.5px] border-error-border',
}

export type ResultActions = {
  readonly onNewTransfer: () => void
  readonly onCorrectAmount: () => void
  readonly onCorrectDestination: () => void
  readonly onRetry: () => void
}

/** Resultado: tracking after a 201, or why nothing (or maybe something) was sent. */
export function TransferResult({
  outcome,
  draft,
  available,
  actions,
}: {
  outcome: TransferOutcome
  draft: TransferDraft
  /** The source's current available, refetched before the outcome was reported. */
  available: Cents | 'unknown'
  actions: ResultActions
}) {
  const navigate = useNavigate()
  const goHome = { label: 'Ir a Inicio', onClick: () => navigate('/') }
  const cancel = { label: 'Cancelar', onClick: () => navigate('/') }
  const amount = formatMoney(draft.amount, draft.source.currency)
  const destination = draft.destination.kind === 'own' ? draft.destination.account.name : draft.destination.accountId

  switch (outcome.kind) {
    case 'created':
      return <Tracking transfer={outcome.transfer} draft={draft} actions={actions} goHome={goHome} />
    case 'insufficient': {
      const currency = draft.source.currency
      const missing = available === 'unknown' || available >= draft.amount ? null : draft.amount - available
      return (
        <ResultPanel
          icon={Wallet}
          tone="error"
          kicker="No se envió"
          title="Fondos insuficientes"
          description="Tu disponible ya no alcanza para esta transferencia. No se debitó dinero de tu cuenta."
          facts={[
            { label: 'Disponible actual', value: available === 'unknown' ? 'No disponible' : formatMoney(available, currency) },
            { label: 'Intentaste transferir', value: amount },
            ...(missing === null ? [] : [{ label: 'Te faltan', value: formatMoney(missing, currency) }]),
          ]}
          primary={{ label: 'Corregir monto', onClick: actions.onCorrectAmount }}
          secondary={cancel}
        />
      )
    }
    case 'notFound':
      return (
        <ResultPanel
          icon={SearchX}
          tone="error"
          kicker="No se envió"
          title="La cuenta destino no existe"
          description={`No encontramos ninguna cuenta con el ID ${destination}. Revisa que esté bien escrito. No se debitó dinero de tu cuenta.`}
          facts={[{ label: 'ID ingresado', value: destination }]}
          primary={{ label: 'Corregir destino', onClick: actions.onCorrectDestination }}
          secondary={cancel}
        />
      )
    case 'unknown':
      return (
        <ResultPanel
          icon={WifiOff}
          tone="warning"
          kicker="Sin confirmación"
          title="No pudimos confirmar el envío"
          description="El resultado es desconocido: puede que la transferencia se haya creado aunque no recibimos la respuesta. Antes de reintentar, revisa Movimientos: si aparece como Pendiente o Completada, no la envíes de nuevo."
          facts={[
            { label: 'Monto', value: amount },
            { label: 'Para', value: destination },
          ]}
          primary={{ label: 'Revisar Movimientos', onClick: () => navigate('/movimientos') }}
          secondary={{ label: 'Reintentar', onClick: actions.onRetry }}
        />
      )
  }
}

const TIMELINE: Readonly<Record<TrackingPhase, readonly [StepState, StepState, StepState]>> = {
  processing: ['done', 'current', 'todo'],
  completed: ['done', 'done', 'done'],
  delayed: ['done', 'delayed', 'todo'],
  failed: ['done', 'done', 'todo'],
}

function Tracking({
  transfer,
  draft,
  actions,
  goHome,
}: {
  transfer: Transfer
  draft: TransferDraft
  actions: ResultActions
  goHome: Action
}) {
  const navigate = useNavigate()
  const phase = useTransferStatus(transfer)
  const amount = formatMoney(draft.amount, draft.source.currency)
  const isOwn = draft.destination.kind === 'own'
  const destination = draft.destination.kind === 'own' ? draft.destination.account.name : draft.destination.accountId
  // The status response lacks the P2P destination side: the creation response is the only source.
  const credited = transfer.to
  const mismatch = credited === null ? null : canTransferBetween(transfer.from, credited)
  const [created, processing, settled] = TIMELINE[phase]
  const pendingMovements = { label: 'Ver en Movimientos', onClick: () => navigate('/movimientos?status=pending') }
  const movements = { label: 'Ver en Movimientos', onClick: () => navigate('/movimientos') }

  const copy = {
    processing: {
      icon: Clock,
      tone: 'pending',
      kicker: 'En proceso',
      title: 'Procesando tu transferencia',
      description: `Ya descontamos ${amount} de tu disponible. La acreditación suele tardar menos de 1 minuto; puedes salir de esta pantalla y seguirla desde Movimientos.`,
      primary: pendingMovements,
      secondary: goHome,
    },
    completed: {
      icon: Check,
      tone: 'success',
      kicker: 'Acreditada',
      title: 'Transferencia acreditada',
      description: isOwn ? `${destination} recibió ${amount}.` : `La cuenta ${destination} recibió ${amount}.`,
      primary: { label: 'Hacer otra transferencia', onClick: actions.onNewTransfer },
      secondary: goHome,
    },
    delayed: {
      icon: Hourglass,
      tone: 'warning',
      kicker: 'Sigue en proceso',
      title: 'Está tardando más de lo normal',
      description: `Los ${amount} siguen descontados de tu disponible. No la envíes de nuevo: podrías pagar dos veces. Revisa su estado en Movimientos.`,
      primary: { label: 'Seguir en Movimientos', onClick: () => navigate('/movimientos?status=pending') },
      secondary: goHome,
    },
    failed: {
      icon: X,
      tone: 'error',
      kicker: 'Fallida',
      title: 'La transferencia no se completó',
      description: 'La transferencia figura como Fallida. Revisa el detalle y tu disponible en Movimientos antes de intentarlo otra vez.',
      primary: movements,
      secondary: goHome,
    },
  } as const satisfies Record<TrackingPhase, Omit<PanelProps, 'facts' | 'timeline' | 'notice'>>

  return (
    <ResultPanel
      {...copy[phase]}
      facts={[
        { label: 'Monto', value: amount },
        { label: 'Desde', value: draft.source.name },
        { label: 'Para', value: destination },
      ]}
      timeline={[
        { label: 'Creada', state: created },
        { label: phase === 'failed' ? 'Fallida' : 'Procesando', state: processing },
        { label: 'Acreditada', state: settled },
      ]}
      notice={
        credited !== null && mismatch !== null && !mismatch.ok
          ? `La cuenta destino resultó ser en ${credited.currency}: se acreditó el mismo monto sin conversión`
          : undefined
      }
      isPulsing={phase === 'processing'}
    />
  )
}

type PanelProps = {
  icon: LucideIcon
  tone: Tone
  kicker: string
  title: string
  description: string
  facts: readonly Fact[]
  timeline?: readonly { label: string; state: StepState }[]
  notice?: string
  primary: Action
  secondary: Action
  isPulsing?: boolean
}

function ResultPanel({ icon, tone, kicker, title, description, facts, timeline, notice, primary, secondary, isPulsing }: PanelProps) {
  return (
    <section
      aria-labelledby={RESULT_HEADING_ID}
      className="flex max-w-[45rem] flex-col gap-5.5 rounded-xl border-[1.5px] border-info-border bg-paper p-6 md:p-10"
    >
      <span aria-hidden="true" className="relative grid size-20 place-items-center">
        <span
          className={cx(
            'absolute inset-0 rounded-full opacity-60',
            TONES[tone],
            isPulsing && 'motion-safe:animate-ping [animation-duration:2.4s]',
          )}
        />
        <span className={cx('relative grid size-14 place-items-center rounded-full', TONES[tone])}>
          <Icon as={icon} size={26} />
        </span>
      </span>
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        <p className="text-caption font-bold uppercase tracking-[0.06em] text-ink-soft">{kicker}</p>
        <h2 id={RESULT_HEADING_ID} tabIndex={-1} className="text-[1.75rem]/tight font-bold outline-none">
          {title}
        </h2>
        <p className="max-w-[56ch] text-base text-pretty">{description}</p>
      </div>
      {notice && <Alert tone="info" title={notice} />}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11.25rem),1fr))] gap-2.5">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0 rounded-lg bg-surface px-4 py-3.5">
            <div className="text-caption text-ink-soft">{fact.label}</div>
            <div className="text-[1.0625rem] font-bold money-wrap">{fact.value}</div>
          </div>
        ))}
      </div>
      {timeline && <StatusTimeline steps={timeline} label="Estado de la transferencia" />}
      <div className="flex flex-wrap gap-2.5">
        <Button onClick={primary.onClick}>{primary.label}</Button>
        <Button variant="secondary" onClick={secondary.onClick}>
          {secondary.label}
        </Button>
      </div>
    </section>
  )
}
