import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '@/api/errors'
import { CURRENCIES, type Currency } from '@/domain/types'
import { BlockedError } from '@/features/blockedError'
import { useToast } from '@/features/toast/useToast'
import { Button } from '@/shared/ui/Button'
import { Alert } from '@/shared/ui/Feedback'
import { SelectField, TextField } from '@/shared/ui/Field'
import { CURRENCY_NAMES } from './accountView'
import { validateNewAccount, type AccountNameError } from './newAccount'
import { useCreateAccount } from './useCreateAccount'

type FormProblem = { readonly name?: string; readonly currency?: string; readonly alert?: string }

const NAME_COPY: Readonly<Record<AccountNameError, string>> = {
  nameTooShort: 'El nombre debe tener al menos 2 caracteres.',
  nameTooLong: 'El nombre puede tener hasta 100 caracteres.',
}
const CURRENCY_OPTIONS = CURRENCIES.map((code) => ({ value: code, label: `${CURRENCY_NAMES[code]} (${code})` }))

/** Our own copy for each failure; API messages are never shown. */
function createProblem(error: Error | null): FormProblem {
  if (error === null) return {}
  if (error instanceof BlockedError && (error.problem === 'nameTooShort' || error.problem === 'nameTooLong')) {
    return { name: NAME_COPY[error.problem as AccountNameError] }
  }
  if (error instanceof ApiError && error.kind === 'validation') {
    const fields = {
      ...(error.fieldErrors.name !== undefined && { name: 'Revisa el nombre de la cuenta.' }),
      ...(error.fieldErrors.currency !== undefined && { currency: 'Elige una moneda de la lista.' }),
    }
    if (Object.keys(fields).length > 0) return fields
  }
  if (error instanceof ApiError && error.kind === 'network') {
    return { alert: 'No pudimos confirmar si se creó la cuenta. Revisa tus saldos antes de volver a intentar.' }
  }
  return { alert: 'No pudimos crear la cuenta. Inténtalo de nuevo.' }
}

/** Minimal account creation (name + currency), inline under "Saldos por cuenta". */
export function NewAccountForm({ onDone }: { onDone: () => void }) {
  const showToast = useToast()
  const create = useCreateAccount()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [nameError, setNameError] = useState<string | undefined>()
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const problem = createProblem(create.error)
  const isSaving = create.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const valid = validateNewAccount({ name, currency })
    if (!valid.ok) {
      setNameError(NAME_COPY[valid.error])
      nameRef.current?.focus()
      return
    }
    setNameError(undefined)
    create.submit(valid.value, {
      onSuccess: (created) => {
        showToast({ kind: 'success', title: 'Cuenta creada', description: `${created.name} ya aparece en tus saldos.` })
        onDone()
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSaving}
      aria-labelledby="new-account-title"
      className="flex max-w-[40rem] flex-col gap-4 rounded-xl bg-surface p-6"
    >
      <h3 id="new-account-title" className="text-subtitle">
        Nueva cuenta
      </h3>
      {problem.alert && <Alert tone="error" title={problem.alert} />}
      <TextField
        ref={nameRef}
        id="new-account-name"
        label="Nombre de la cuenta"
        placeholder="Ej.: Ahorro"
        value={name}
        maxLength={100}
        disabled={isSaving}
        error={nameError ?? problem.name}
        onChange={(event) => setName(event.target.value)}
      />
      <SelectField
        id="new-account-currency"
        label="Moneda"
        value={currency}
        disabled={isSaving}
        error={problem.currency}
        options={CURRENCY_OPTIONS}
        onChange={(event) => setCurrency(CURRENCIES.find((code) => code === event.target.value) ?? currency)}
      />
      <Alert tone="info" title="La moneda no se puede cambiar después" role="note">
        Elige la moneda en la que vas a guardar el dinero de esta cuenta.
      </Alert>
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" size="md" loading={isSaving} loadingLabel="Creando…">
          Crear cuenta
        </Button>
        <Button variant="secondary" size="md" disabled={isSaving} onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
