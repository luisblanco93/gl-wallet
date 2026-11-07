import { ArrowRight, CircleHelp, Plus, RotateCw, User, Wallet } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { FxRates } from '@/domain/fx'
import { currencySymbol, formatAmountInput, formatMoney, parseAmount } from '@/domain/money'
import { ownDestinationOptions, validateTransfer, type TransferDraft, type TransferErrors } from '@/domain/transferForm'
import { MAX_DESCRIPTION_LENGTH, type Cents, type Currency } from '@/domain/types'
import { AccountOption } from '@/features/accounts/AccountOption'
import { CURRENCY_NAMES, toAccountCardView } from '@/features/accounts/accountView'
import { NewAccountForm } from '@/features/accounts/NewAccountForm'
import type { AccountView, PendingStatus } from '@/features/accounts/useAccounts'
import { Button } from '@/shared/ui/Button'
import { Alert, StateMessage } from '@/shared/ui/Feedback'
import { MoneyInput, TextField } from '@/shared/ui/Field'
import { Icon } from '@/shared/ui/Icon'
import type { Choice } from '@/shared/ui/SegmentedControl'
import { Tabs } from '@/shared/ui/Tabs'
import { estimateLabel } from '@/features/fx/estimateLabel'
import { amountProblemMessage, currencyReason, destinationMessage, type DestinationKind } from './transferCopy'
import { FIELD_IDS, FORM_ALERT_ID, toTransferInput, type TransferFormValues } from './transferFields'

const FORM_ID = 'transfer-form'
const SOURCE_LABEL_ID = 'transfer-source-label'
const TABS_ID = 'transfer-destination'
const DESTINATION_TABS: readonly Choice<DestinationKind>[] = [
  { value: 'own', label: 'Mis cuentas', icon: Wallet },
  { value: 'p2p', label: 'Otra persona', icon: User },
]

function errorCount(errors: TransferErrors): number {
  return Object.values(errors).filter((problem) => problem !== undefined).length
}

type Props = {
  accounts: readonly AccountView[]
  pending: PendingStatus
  onRetryPending: () => void
  rates: FxRates | undefined
  values: TransferFormValues
  onChange: (changes: Partial<TransferFormValues>) => void
  /** A problem reported after a confirm (e.g. the available changed); the form keeps its values. */
  alert: string | undefined
  onContinue: (draft: TransferDraft) => void
  onCancel: () => void
}

/** Datos: source, destination (own or P2P), amount against available and description. Nothing is sent here. */
export function TransferForm({ accounts, pending, onRetryPending, rates, values, onChange, alert, onContinue, onCancel }: Props) {
  const [triedContinue, setTriedContinue] = useState(false)
  const [isCreatingAccount, setCreatingAccount] = useState(false)
  // When the inline account form closes, focus goes to the destinations it may have added to.
  const [closedAccountForm, setClosedAccountForm] = useState(0)
  useEffect(() => {
    if (closedAccountForm === 0) return
    const group = document.getElementById(FIELD_IDS.own)
    ;(group?.querySelector<HTMLElement>('button:not(:disabled)') ?? group)?.focus()
  }, [closedAccountForm])
  const toggleAccountForm = (isOpen: boolean) => {
    setCreatingAccount(isOpen)
    if (!isOpen) setClosedAccountForm((count) => count + 1)
  }
  const summaryRef = useRef<HTMLDivElement>(null)
  const [focusSummary, setFocusSummary] = useState(0)
  useEffect(() => {
    if (focusSummary > 0) summaryRef.current?.focus()
  }, [focusSummary])

  const source = accounts.find((account) => account.id === values.sourceId)
  const validation = validateTransfer(toTransferInput(values), accounts)
  const errors: TransferErrors = validation.ok ? {} : validation.error
  const currency = source?.currency ?? 'ARS'
  const parsedAmount = parseAmount(values.amountText)

  // Above available (or available unknown) is shown while typing; other problems after "Revisar".
  const isCalculating = errors.amount?.reason === 'unknownAvailable' && pending === 'loading'
  const isLiveAmountProblem = errors.amount?.reason === 'insufficient' || (errors.amount?.reason === 'unknownAvailable' && !isCalculating)
  const amountError =
    errors.amount && (triedContinue || isLiveAmountProblem) && !isCalculating ? amountProblemMessage(errors.amount, currency) : undefined
  const remaining =
    source && source.available !== 'unknown' && parsedAmount.ok && errors.amount === undefined
      ? `Te quedarán ${formatMoney(source.available - parsedAmount.value, currency)} disponibles en ${source.name}.`
      : undefined
  const count = triedContinue ? errorCount(errors) : 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTriedContinue(true)
    if (validation.ok) onContinue(validation.value)
    else setFocusSummary((current) => current + 1)
  }

  function selectSource(sourceId: string) {
    const next = accounts.find((account) => account.id === sourceId)
    const own = accounts.find((account) => account.id === values.ownId)
    const keepsOwn = next !== undefined && own !== undefined && own.id !== next.id && own.currency === next.currency
    onChange({ sourceId, ownId: keepsOwn ? values.ownId : '' })
  }

  return (
    // The inline account creation is a form of its own and forms cannot nest: the transfer
    // controls join this form through the `form` attribute instead of being its children.
    <div className="flex min-w-0 flex-[2_1_28rem] flex-col gap-7">
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate aria-label="Datos de la transferencia" />
      {count > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="outline-none">
          <Alert tone="error" title={count === 1 ? 'Revisa 1 campo' : `Revisa ${count} campos`} />
        </div>
      )}
      {alert && (
        <div id={FORM_ALERT_ID} tabIndex={-1} className="outline-none">
          <Alert tone="error" title={alert} />
        </div>
      )}

      <fieldset className="flex flex-col gap-2.5">
        <legend id={SOURCE_LABEL_ID} className="mb-2.5 text-subtitle">
          1. Desde qué cuenta
        </legend>
        <div role="radiogroup" id={FIELD_IDS.source} aria-labelledby={SOURCE_LABEL_ID} className="flex flex-col gap-2.5">
          {accounts.map((account) => (
            <AccountOption
              key={account.id}
              account={toAccountCardView(account, pending)}
              selected={account.id === values.sourceId}
              onSelect={() => selectSource(account.id)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3.5">
        <legend className="mb-2.5 text-subtitle">2. A dónde va el dinero</legend>
        <Tabs
          idPrefix={TABS_ID}
          label="Tipo de destino"
          items={DESTINATION_TABS}
          value={values.tab}
          onChange={(tab) => onChange({ tab })}
        >
          {values.tab === 'own' ? (
            <OwnDestinations
              source={source}
              accounts={accounts}
              pending={pending}
              rates={rates}
              amount={parsedAmount.ok ? parsedAmount.value : null}
              selectedId={values.ownId}
              onSelect={(ownId) => onChange({ ownId })}
              error={triedContinue && errors.destination ? destinationMessage(errors.destination, 'own') : undefined}
              isCreatingAccount={isCreatingAccount}
              onCreateAccount={toggleAccountForm}
            />
          ) : (
            <>
              <TextField
                id={FIELD_IDS.p2p}
                form={FORM_ID}
                label="ID de la cuenta destino"
                placeholder="Ej.: acc-4"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={values.p2pId}
                error={triedContinue && errors.destination ? destinationMessage(errors.destination, 'p2p') : undefined}
                onChange={(event) => onChange({ p2pId: event.target.value })}
              />
              <div className="flex items-start gap-3 rounded-lg bg-help-bg px-4 py-3.5 text-sm text-pretty">
                <Icon as={CircleHelp} size={20} className="mt-px shrink-0" />
                <p>
                  <strong>No podemos mostrar el nombre del titular.</strong> Solo verás el ID que ingreses. Pídele a la
                  persona que te lo comparta: lo encuentra en su cuenta y tiene el formato acc- seguido de números.
                </p>
              </div>
            </>
          )}
        </Tabs>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-2.5 text-subtitle">3. Cuánto quieres transferir</legend>
        <MoneyInput
          id={FIELD_IDS.amount}
          form={FORM_ID}
          label={source ? `Monto en ${source.name}` : 'Monto'}
          symbol={currencySymbol(currency)}
          value={values.amountText}
          error={amountError}
          okMessage={remaining}
          availableLabel={<AvailableLabel source={source} isCalculating={isCalculating} />}
          onChange={(event) => onChange({ amountText: event.target.value })}
          onBlur={() => {
            if (parsedAmount.ok) onChange({ amountText: formatAmountInput(parsedAmount.value) })
          }}
        />
        {errors.amount?.reason === 'unknownAvailable' && pending === 'error' && (
          <Button variant="secondary" size="md" icon={RotateCw} className="self-start" onClick={onRetryPending}>
            Reintentar
          </Button>
        )}
        <TextField
          id={FIELD_IDS.description}
          form={FORM_ID}
          label="Descripción (opcional)"
          value={values.description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </fieldset>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" form={FORM_ID} iconEnd={ArrowRight}>
          Revisar transferencia
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

function AvailableLabel({ source, isCalculating }: { source: AccountView | undefined; isCalculating: boolean }) {
  if (source === undefined) return null
  if (isCalculating) return <>Calculando tu disponible en {source.name}…</>
  if (source.available === 'unknown') return null
  return (
    <>
      Disponible en {source.name}: <strong>{formatMoney(source.available, source.currency)}</strong>
    </>
  )
}

function OwnDestinations({
  source,
  accounts,
  pending,
  rates,
  amount,
  selectedId,
  onSelect,
  error,
  isCreatingAccount,
  onCreateAccount,
}: {
  source: AccountView | undefined
  amount: Cents | null
  accounts: readonly AccountView[]
  pending: PendingStatus
  rates: FxRates | undefined
  selectedId: string
  onSelect: (id: string) => void
  error: string | undefined
  isCreatingAccount: boolean
  onCreateAccount: (isCreating: boolean) => void
}) {
  if (source === undefined) return null
  const options = ownDestinationOptions(source, accounts)
  const hasEligible = options.some((option) => option.check.ok)

  return (
    <>
      {options.length > 0 && (
        <div role="radiogroup" id={FIELD_IDS.own} tabIndex={-1} aria-label="Cuenta destino" className="flex flex-col gap-2.5 outline-none">
          {options.map(({ account, check }) => {
            const noteId = `${FIELD_IDS.own}-${account.id}-note`
            return (
              <div key={account.id} className="flex flex-col gap-1.5">
                <AccountOption
                  account={toAccountCardView(account, pending)}
                  selected={account.id === selectedId}
                  disabled={!check.ok}
                  describedBy={check.ok ? undefined : noteId}
                  onSelect={() => onSelect(account.id)}
                />
                {!check.ok && (
                  <p id={noteId} className="px-4.5 text-caption font-semibold text-ink-soft money-wrap">
                    {currencyReason(check.from, check.to)}
                    <OwnEstimate amount={amount} from={check.from} to={check.to} rates={rates} />
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
      {error && <Alert tone="error" title={error} />}
      {!hasEligible &&
        (isCreatingAccount ? (
          <NewAccountForm onDone={() => onCreateAccount(false)} />
        ) : (
          <StateMessage
            title={`No tienes otra cuenta en ${CURRENCY_NAMES[source.currency].toLowerCase()}`}
            description={`Solo puedes transferir entre tus cuentas de la misma moneda. Crea otra cuenta en ${source.currency} o envía el dinero a otra persona.`}
            action={{ label: 'Crear cuenta', icon: Plus, onClick: () => onCreateAccount(true) }}
          />
        ))}
    </>
  )
}

/** "$ 100.000,00 ≈ US$ 64,72, estimado…" only when the amount parses and the rates are known. */
function OwnEstimate({ amount, from, to, rates }: { amount: Cents | null; from: Currency; to: Currency; rates: FxRates | undefined }) {
  if (amount === null || rates === undefined) return null
  return <span className="block font-normal">{estimateLabel(amount, from, to, rates)}</span>
}
