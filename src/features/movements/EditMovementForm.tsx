import { useState, type FormEvent } from 'react'
import { ApiError } from '@/api/errors'
import type { Movement } from '@/domain/types'
import { BlockedError } from '@/features/blockedError'
import { Button } from '@/shared/ui/Button'
import { Alert } from '@/shared/ui/Feedback'
import { LockedField, SelectField, TextField } from '@/shared/ui/Field'
import { MAX_DESCRIPTION_LENGTH } from './movementChecks'
import { editCategoryOptions } from './movementDetailView'

type EditField = 'category' | 'description'
type FieldErrors = Partial<Record<EditField, string>>
type SaveProblem = { readonly fields: FieldErrors; readonly alert?: { readonly title: string; readonly body: string } }

const FIELD_COPY: Readonly<Record<EditField, string>> = {
  description: `La descripción puede tener hasta ${MAX_DESCRIPTION_LENGTH} caracteres.`,
  category: 'Elige una categoría de la lista.',
}
const NOT_SAVED = 'El movimiento quedó como estaba. Inténtalo de nuevo.'
const LOCKED_AMOUNT_REASON =
  'El monto no se puede modificar porque ya impactó en tu saldo. Si es incorrecto, registra un movimiento nuevo que lo compense.'

/** Our own copy for each failure; API messages are never shown. */
function saveProblem(error: Error | null): SaveProblem {
  if (error === null) return { fields: {} }
  if (error instanceof ApiError && error.kind === 'validation') {
    const fields: FieldErrors = {}
    for (const field of ['category', 'description'] as const) {
      if (error.fieldErrors[field] !== undefined) fields[field] = FIELD_COPY[field]
    }
    if (Object.keys(fields).length > 0) return { fields }
  }
  if (error instanceof BlockedError && error.problem === 'descriptionTooLong') {
    return { fields: { description: FIELD_COPY.description } }
  }
  if (error instanceof BlockedError && error.problem === 'invalidCategory') {
    return { fields: { category: FIELD_COPY.category } }
  }
  if (error instanceof ApiError && error.kind === 'network') {
    return { fields: {}, alert: { title: 'No pudimos conectar con el servidor', body: NOT_SAVED } }
  }
  return { fields: {}, alert: { title: 'No pudimos guardar los cambios', body: NOT_SAVED } }
}

export type EditSubmission = {
  readonly submit: (edit: { category: string; description: string }) => void
  readonly isSaving: boolean
  /** The last save succeeded; shown until the user changes something again. */
  readonly isSaved: boolean
  readonly error: Error | null
}

/** Category and description of an income or expense; the amount is shown locked with the reason. */
export function EditMovementForm({
  movement,
  amountLabel,
  submission,
}: {
  movement: Movement
  amountLabel: string
  submission: EditSubmission
}) {
  const [description, setDescription] = useState(movement.description)
  const [category, setCategory] = useState(movement.category)
  const dirty = description !== movement.description || category !== movement.category
  const problem = saveProblem(submission.error)
  const { isSaving } = submission

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (dirty) submission.submit({ category, description })
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSaving}
      aria-labelledby="edit-movement-title"
      className="flex flex-col gap-4 rounded-[24px] bg-surface p-5"
    >
      <h3 id="edit-movement-title" className="text-subtitle">
        Editar
      </h3>
      {submission.isSaved && !dirty && (
        <Alert tone="success" role="status" title="Cambios guardados">
          El movimiento ya muestra la nueva categoría y descripción.
        </Alert>
      )}
      {problem.alert && (
        <Alert tone="error" title={problem.alert.title}>
          {problem.alert.body}
        </Alert>
      )}
      <TextField
        id="edit-movement-description"
        label="Descripción (opcional)"
        value={description}
        maxLength={MAX_DESCRIPTION_LENGTH}
        disabled={isSaving}
        error={problem.fields.description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <SelectField
        id="edit-movement-category"
        label="Categoría"
        value={category}
        disabled={isSaving}
        error={problem.fields.category}
        options={editCategoryOptions(movement)}
        onChange={(event) => setCategory(event.target.value)}
      />
      <LockedField id="edit-movement-amount" label="Monto" value={amountLabel} reason={LOCKED_AMOUNT_REASON} />
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" loading={isSaving} loadingLabel="Guardando…" disabled={!dirty}>
          Guardar cambios
        </Button>
        <Button
          variant="secondary"
          disabled={!dirty || isSaving}
          onClick={() => {
            setDescription(movement.description)
            setCategory(movement.category)
          }}
        >
          Descartar
        </Button>
      </div>
    </form>
  )
}
