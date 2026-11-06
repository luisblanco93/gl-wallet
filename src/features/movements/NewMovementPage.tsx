import { ArrowDownLeft, ArrowUpRight, RotateCw, TriangleAlert, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { availableAfter } from '@/domain/balances'
import { categoriesFor, categoryLabel } from '@/domain/categories'
import { currencySymbol, formatAmountInput, formatMoney, formatSignedMoney, parseAmount, signedAmount } from '@/domain/money'
import { MAX_DESCRIPTION_LENGTH, type Movement } from '@/domain/types'
import { AccountOption } from '@/features/accounts/AccountOption'
import { toAccountCardView } from '@/features/accounts/accountView'
import { useAccounts, type AccountView } from '@/features/accounts/useAccounts'
import { BlockedError } from '@/features/blockedError'
import { useToast } from '@/features/toast/useToast'
import { Button } from '@/shared/ui/Button'
import { Alert, LoadingRegion, Skeleton, StateMessage } from '@/shared/ui/Feedback'
import { MoneyInput, SelectField, TextField } from '@/shared/ui/Field'
import { PageTitle } from '@/shared/ui/PageTitle'
import { SegmentedControl, type Choice } from '@/shared/ui/SegmentedControl'
import {
  reviewDraft,
  withType,
  type DraftField,
  type MovementKind,
  type NewMovementDraft,
} from './newMovementForm'
import { useCreateMovement } from './useCreateMovement'

const TYPES: readonly Choice<MovementKind>[] = [
  { value: 'income', label: 'Ingreso', icon: ArrowDownLeft },
  { value: 'expense', label: 'Gasto', icon: ArrowUpRight },
]
const FIELD_IDS: Readonly<Record<DraftField, string>> = {
  accountId: 'new-movement-account',
  amount: 'new-movement-amount',
  category: 'new-movement-category',
}
type SendProblem = {
  readonly fields: Partial<Record<DraftField, string>>
  readonly alert?: string
  /** The request may have gone through (no response): the user checks before trying again. */
  readonly outcomeUnknown?: boolean
}

/** Our own copy for each failure: API messages are never shown, and the form keeps its values. */
function sendProblem(error: Error | null): SendProblem {
  if (error === null) return { fields: {} }
  if (error instanceof ApiError && error.kind === 'validation') {
    const fields = {
      ...(error.fieldErrors.amount !== undefined && { amount: 'Revisa el monto.' }),
      ...(error.fieldErrors.category !== undefined && { category: 'Elige una categoría de la lista.' }),
      ...(error.fieldErrors.accountId !== undefined && { accountId: 'Elige una cuenta.' }),
    }
    if (Object.keys(fields).length > 0) return { fields }
  }
  if (error instanceof ApiError && error.kind === 'network') {
    return { fields: {}, outcomeUnknown: true }
  }
  if (error instanceof BlockedError && error.problem === 'insufficient') {
    return { fields: {}, alert: 'Tu disponible cambió y ya no alcanza para este gasto.' }
  }
  return { fields: {}, alert: 'No pudimos registrar el movimiento. Inténtalo de nuevo.' }
}

function successToast(created: Movement, account: AccountView) {
  const after = availableAfter(account.available, created)
  const amount = formatSignedMoney(signedAmount(created), created.currency)
  const newAvailable = after === 'unknown' ? '' : ` Nuevo disponible: ${formatMoney(after, account.currency)}.`
  return {
    kind: 'success' as const,
    title: created.type === 'expense' ? 'Gasto registrado' : 'Ingreso registrado',
    description: `${amount} en ${account.name}.${newAvailable}`,
  }
}

/** `/movimientos/nuevo`: records an income or an expense; an expense above available is blocked. */
export function NewMovementPage() {
  const accounts = useAccounts()

  return (
    <>
      <header className="flex flex-col gap-1">
        <PageTitle>Nuevo movimiento</PageTitle>
        <p className="text-body text-ink-muted">Registra un ingreso o un gasto en una de tus cuentas.</p>
      </header>
      {accounts.status === 'loading' && (
        <LoadingRegion label="Cargando tus cuentas…">
          <Skeleton className="h-18 w-full max-w-[40rem]" />
        </LoadingRegion>
      )}
      {accounts.status === 'error' && (
        <StateMessage
          tone="error"
          icon={WifiOff}
          title="No fue posible conectar con el servidor"
          description="Sin tus cuentas no podemos registrar movimientos. Revisa tu conexión e inténtalo de nuevo."
          action={{ label: 'Reintentar', icon: RotateCw, onClick: accounts.retry }}
        />
      )}
      {accounts.status === 'ready' && (
        <NewMovementForm accounts={accounts.accounts} pending={accounts.pending} onRetryPending={accounts.retryPending} />
      )}
    </>
  )
}

function NewMovementForm({
  accounts,
  pending,
  onRetryPending,
}: {
  accounts: readonly AccountView[]
  pending: 'loading' | 'error' | 'ready'
  onRetryPending: () => void
}) {
  const navigate = useNavigate()
  const showToast = useToast()
  const create = useCreateMovement()
  const [params] = useSearchParams()
  const [draft, setDraft] = useState<NewMovementDraft>(() => ({
    type: 'expense',
    accountId: accounts.find((account) => account.id === params.get('accountId'))?.id ?? accounts[0]?.id ?? '',
    amountText: '',
    category: '',
    description: '',
  }))
  const [triedSubmit, setTriedSubmit] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  // After a rejected submit the summary exists only on the next render: focus it then.
  const [focusSummary, setFocusSummary] = useState(0)
  useEffect(() => {
    if (focusSummary > 0) summaryRef.current?.focus()
  }, [focusSummary])

  const account = accounts.find((option) => option.id === draft.accountId)
  const review = reviewDraft(draft, account)
  const sent = sendProblem(create.error)
  const visibleErrors = triedSubmit ? { ...sent.fields, ...review.errors } : sent.fields
  // While pending transfers load, available is unknown: the expense stays blocked, but nothing failed yet.
  const isCalculating = review.debitBlock?.reason === 'unknownAvailable' && pending === 'loading'
  const amountError = isCalculating ? undefined : review.debitBlock ? review.errors.amount : visibleErrors.amount
  const errorCount = Object.keys(visibleErrors).length
  const isSending = create.isPending
  const update = (changes: Partial<NewMovementDraft>) => setDraft((current) => ({ ...current, ...changes }))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTriedSubmit(true)
    if (review.movement === null || account === undefined) {
      setFocusSummary((count) => count + 1)
      return
    }
    create.submit(
      { movement: review.movement, available: account.available },
      {
        onSuccess: (created) => {
          showToast(successToast(created, account))
          navigate('/')
        },
      },
    )
  }

  if (accounts.length === 0) {
    return (
      <StateMessage
        title="Primero necesitas una cuenta"
        description="Crea una cuenta desde Inicio para registrar ingresos y gastos."
        action={{ label: 'Ir a Inicio', onClick: () => navigate('/') }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={isSending} className="flex max-w-[40rem] flex-col gap-6">
      {triedSubmit && errorCount > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="outline-none">
          <Alert tone="error" title={errorCount === 1 ? 'Revisa 1 campo' : `Revisa ${errorCount} campos`} />
        </div>
      )}
      {sent.alert && <Alert tone="error" title={sent.alert} />}
      {sent.outcomeUnknown && (
        <Alert tone="error" title="No pudimos confirmar el registro">
          <span>
            Puede que se haya registrado aunque no recibimos la respuesta. Revisa Movimientos antes de volver a
            intentar, para no registrarlo dos veces.
          </span>
          <Link to="/movimientos" className="font-bold text-link underline underline-offset-3">
            Revisar Movimientos
          </Link>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-label">Tipo</span>
        <SegmentedControl
          label="Tipo de movimiento"
          items={TYPES}
          value={draft.type}
          disabled={isSending}
          onChange={(type) => setDraft((current) => withType(current, type))}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span id={FIELD_IDS.accountId} className="text-label">
          Cuenta
        </span>
        <div role="radiogroup" aria-labelledby={FIELD_IDS.accountId} className="flex flex-col gap-2.5">
          {accounts.map((option) => (
            <AccountOption
              key={option.id}
              account={toAccountCardView(option, pending)}
              selected={option.id === draft.accountId}
              disabled={isSending}
              onSelect={() => update({ accountId: option.id })}
            />
          ))}
        </div>
      </div>

      <MoneyInput
        id={FIELD_IDS.amount}
        label={account ? `Monto en ${account.name}` : 'Monto'}
        symbol={currencySymbol(account?.currency ?? 'ARS')}
        value={draft.amountText}
        disabled={isSending}
        error={amountError}
        availableLabel={
          account && account.available !== 'unknown' ? (
            <>
              Disponible en {account.name}: <strong>{formatMoney(account.available, account.currency)}</strong>
            </>
          ) : undefined
        }
        onChange={(event) => update({ amountText: event.target.value })}
        onBlur={() => {
          const parsed = parseAmount(draft.amountText)
          if (parsed.ok) update({ amountText: formatAmountInput(parsed.value) })
        }}
      />
      {review.debitBlock && account && (
        <DebitBlockAlert
          isCalculating={isCalculating}
          accountName={account.name}
          available={review.debitBlock.reason === 'insufficient' ? formatMoney(review.debitBlock.available, account.currency) : null}
          onRetry={onRetryPending}
        />
      )}

      <SelectField
        id={FIELD_IDS.category}
        label="Categoría"
        placeholder="Elige una categoría"
        value={draft.category}
        disabled={isSending}
        error={visibleErrors.category}
        options={categoriesFor(draft.type).map((id) => ({ value: id, label: categoryLabel(id) }))}
        onChange={(event) => update({ category: event.target.value })}
      />
      <TextField
        id="new-movement-description"
        label="Descripción (opcional)"
        value={draft.description}
        maxLength={MAX_DESCRIPTION_LENGTH}
        disabled={isSending}
        onChange={(event) => update({ description: event.target.value })}
      />
      {visibleErrors.accountId && <Alert tone="error" title={visibleErrors.accountId} />}

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" loading={isSending} loadingLabel="Registrando…" disabled={review.debitBlock !== null}>
          Registrar movimiento
        </Button>
        <Button variant="secondary" disabled={isSending} onClick={() => navigate('/movimientos')}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

/** The handoff's warning, used here as the blocking message of the debit rule. */
function DebitBlockAlert({
  isCalculating,
  accountName,
  available,
  onRetry,
}: {
  isCalculating: boolean
  accountName: string
  available: string | null
  onRetry: () => void
}) {
  if (isCalculating) {
    return (
      <Alert tone="pending" title="Calculando tu disponible…">
        Restamos lo que está en proceso antes de permitir el gasto.
      </Alert>
    )
  }
  if (available === null) {
    return (
      <div className="flex flex-col items-start gap-2.5">
        <Alert tone="warning" icon={TriangleAlert} title="No pudimos calcular tu disponible">
          Hasta saberlo no registramos gastos de {accountName}, para que no gastes dinero que está en proceso.
        </Alert>
        <Button variant="secondary" size="md" icon={RotateCw} onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    )
  }
  return (
    <Alert tone="warning" icon={TriangleAlert} title="Este gasto supera tu disponible">
      Tu disponible en {accountName} es {available}. Ingresa un monto menor o elige otra cuenta.
    </Alert>
  )
}
