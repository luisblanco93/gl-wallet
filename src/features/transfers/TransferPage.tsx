import { useIsMutating } from '@tanstack/react-query'
import { RotateCw, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { formatMoney, parseAmount } from '@/domain/money'
import type { TransferDraft } from '@/domain/transferForm'
import { useAccounts, type AccountView } from '@/features/accounts/useAccounts'
import { useFxRates } from '@/features/fx/useFxRates'
import { LoadingRegion, Skeleton, StateMessage } from '@/shared/ui/Feedback'
import { PageTitle } from '@/shared/ui/PageTitle'
import { Stepper } from '@/shared/ui/Steps'
import { sendFailure } from './transferCopy'
import { FIELD_IDS, FORM_ALERT_ID, type TransferFormValues } from './transferFields'
import { TransferForm } from './TransferForm'
import { RESULT_HEADING_ID, TransferResult, type TransferOutcome } from './TransferResult'
import { REVIEW_HEADING_ID, TransferReview } from './TransferReview'
import { CREATE_TRANSFER_KEY, useCreateTransfer } from './useCreateTransfer'

const STEPS = ['Datos', 'Revisión', 'Resultado'] as const
const EMPTY_VALUES: TransferFormValues = { sourceId: '', tab: 'own', ownId: '', p2pId: '', amountText: '', description: '' }
const NO_ACCOUNTS: readonly AccountView[] = []

type Stage =
  | { readonly name: 'form'; readonly alert?: string }
  /** `isRetryAfterUnknown`: the previous confirm got no trustworthy response, so it may have gone through. */
  | { readonly name: 'review'; readonly draft: TransferDraft; readonly isRetryAfterUnknown?: boolean }
  | { readonly name: 'result'; readonly draft: TransferDraft; readonly outcome: TransferOutcome }

const STEP_OF: Readonly<Record<Stage['name'], number>> = { form: 1, review: 2, result: 3 }

/** A radiogroup takes focus on its checked (or first enabled) option; anything else directly. */
function focusById(id: string): void {
  const element = document.getElementById(id)
  if (element === null) return
  const target =
    element.getAttribute('role') === 'radiogroup'
      ? (element.querySelector<HTMLElement>('[aria-checked="true"]:not(:disabled)') ??
        element.querySelector<HTMLElement>('button:not(:disabled)') ??
        element)
      : element
  target.focus()
}

/** `/transferir`: Datos → Revisión → Resultado. Nothing is sent before the user confirms in the review. */
export function TransferPage() {
  const navigate = useNavigate()
  const accounts = useAccounts()
  const rates = useFxRates()
  const create = useCreateTransfer()
  // A POST still in flight from an earlier visit to this screen: its result is checked in Movimientos.
  const isOtherSendInFlight = useIsMutating({ mutationKey: CREATE_TRANSFER_KEY }) > 0 && !create.isPending
  const [stored, setValues] = useState<TransferFormValues>(EMPTY_VALUES)
  const [stage, setStage] = useState<Stage>({ name: 'form' })
  const [focusRequest, setFocusRequest] = useState<{ readonly id: string; readonly count: number } | null>(null)
  useEffect(() => {
    if (focusRequest !== null) focusById(focusRequest.id)
  }, [focusRequest])

  const list = accounts.status === 'ready' ? accounts.accounts : NO_ACCOUNTS
  const values = stored.sourceId === '' ? { ...stored, sourceId: list[0]?.id ?? '' } : stored
  const requestFocus = (id: string) => setFocusRequest((current) => ({ id, count: (current?.count ?? 0) + 1 }))
  const update = (changes: Partial<TransferFormValues>) => setValues({ ...values, ...changes })
  // The current figure, not the draft's: it may have changed since Datos (double-spend guard).
  const availableOf = (draft: TransferDraft) => list.find((account) => account.id === draft.source.id)?.available ?? 'unknown'
  const destinationField = values.tab === 'own' ? FIELD_IDS.own : FIELD_IDS.p2p

  function backToForm(field: string, alert?: string) {
    create.reset()
    setStage({ name: 'form', alert })
    requestFocus(alert ? FORM_ALERT_ID : field === FIELD_IDS.own || field === FIELD_IDS.p2p ? destinationField : field)
  }

  function review(draft: TransferDraft, isRetryAfterUnknown = false) {
    create.reset()
    setStage({ name: 'review', draft, isRetryAfterUnknown })
    requestFocus(REVIEW_HEADING_ID)
  }

  function showResult(draft: TransferDraft, outcome: TransferOutcome) {
    setStage({ name: 'result', draft, outcome })
    requestFocus(RESULT_HEADING_ID)
  }

  function confirm(draft: TransferDraft) {
    const transfer = {
      fromAccountId: draft.source.id,
      toAccountId: draft.destination.kind === 'own' ? draft.destination.account.id : draft.destination.accountId,
      amount: draft.amount,
      description: draft.description,
    }
    create.submit(
      { transfer, available: availableOf(draft) },
      {
        onSuccess: (created) => showResult(draft, { kind: 'created', transfer: created }),
        onError: (error) => {
          const failure = sendFailure(error)
          if (failure.kind === 'blocked' || failure.kind === 'form') backToForm(FIELD_IDS.amount, failure.alert)
          else showResult(draft, { kind: failure.kind })
        },
      },
    )
  }

  function startOver() {
    create.reset()
    setValues({ ...EMPTY_VALUES, sourceId: values.sourceId, tab: values.tab })
    setStage({ name: 'form' })
    requestFocus(FIELD_IDS.source)
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <PageTitle>Transferir</PageTitle>
        <p className="text-body text-ink-muted">Envía dinero entre tus cuentas o a otra persona.</p>
      </header>
      <Stepper steps={STEPS} current={STEP_OF[stage.name]} />

      {stage.name === 'review' && (
        <TransferReview
          draft={stage.draft}
          available={availableOf(stage.draft)}
          isSending={create.isPending}
          isBlockedByOtherSend={isOtherSendInFlight}
          isRetryAfterUnknown={stage.isRetryAfterUnknown ?? false}
          onConfirm={() => confirm(stage.draft)}
          onEdit={(field) => backToForm(field)}
          onBack={() => backToForm(FIELD_IDS.amount)}
        />
      )}
      {stage.name === 'result' && (
        <TransferResult
          outcome={stage.outcome}
          draft={stage.draft}
          available={availableOf(stage.draft)}
          actions={{
            onNewTransfer: startOver,
            onCorrectAmount: () => backToForm(FIELD_IDS.amount),
            onCorrectDestination: () => backToForm(FIELD_IDS.p2p),
            onRetry: () => review(stage.draft, true),
          }}
        />
      )}
      {stage.name === 'form' && accounts.status === 'loading' && (
        <LoadingRegion label="Cargando tus cuentas…">
          <Skeleton className="h-18 w-full max-w-[40rem]" />
        </LoadingRegion>
      )}
      {stage.name === 'form' && accounts.status === 'error' && (
        <StateMessage
          tone="error"
          icon={WifiOff}
          title="No fue posible conectar con el servidor"
          description="Sin tus cuentas no podemos preparar la transferencia. Revisa tu conexión e inténtalo de nuevo."
          action={{ label: 'Reintentar', icon: RotateCw, onClick: accounts.retry }}
        />
      )}
      {stage.name === 'form' && accounts.status === 'ready' && list.length === 0 && (
        <StateMessage
          title="Primero necesitas una cuenta"
          description="Crea una cuenta desde Inicio para poder transferir."
          action={{ label: 'Ir a Inicio', onClick: () => navigate('/') }}
        />
      )}
      {stage.name === 'form' && accounts.status === 'ready' && list.length > 0 && (
        <div className="flex flex-wrap items-start gap-8">
          <TransferForm
            accounts={list}
            pending={accounts.pending}
            onRetryPending={accounts.retryPending}
            rates={rates}
            values={values}
            onChange={update}
            alert={stage.alert}
            onContinue={review}
            onCancel={() => navigate('/')}
          />
          <Summary accounts={list} values={values} />
        </div>
      )}
    </>
  )
}

/** Desktop aside: what the form will send so far. */
function Summary({ accounts, values }: { accounts: readonly AccountView[]; values: TransferFormValues }) {
  const source = accounts.find((account) => account.id === values.sourceId)
  const own = accounts.find((account) => account.id === values.ownId)
  const amount = parseAmount(values.amountText)
  const destination = values.tab === 'own' ? own?.name : values.p2pId.trim() || undefined
  const rows = [
    { label: 'Desde', value: source?.name },
    { label: 'Para', value: destination },
    { label: 'Monto', value: source && amount.ok ? formatMoney(amount.value, source.currency) : undefined },
  ]
  return (
    <aside aria-label="Resumen" className="sticky top-6 hidden min-w-0 flex-[1_1_16rem] flex-col gap-4 rounded-[28px] bg-surface p-6 md:flex">
      <h2 className="text-subtitle">Resumen</h2>
      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-caption text-ink-muted">{row.label}</dt>
            <dd className="font-bold money-wrap">{row.value ?? '—'}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-ink-soft">Nada se envía hasta que confirmes en el paso de revisión.</p>
    </aside>
  )
}
