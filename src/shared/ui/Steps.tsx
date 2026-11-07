import { Check, Clock, Hourglass, type LucideIcon } from 'lucide-react'
import { cx } from './cx'
import { Icon } from './Icon'

/** "Datos → Revisión → Resultado": full row from md up, "Paso 2 de 3" with a progress bar below. */
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <>
      <div className="md:hidden">
        <p className="mb-2 text-sm font-bold">
          Paso {current} de {steps.length} · {steps[current - 1]}
        </p>
        <div aria-hidden="true" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length},1fr)` }}>
          {steps.map((label, index) => (
            <span
              key={label}
              className={cx(
                'h-1.5 rounded-pill',
                index + 1 < current ? 'bg-success-solid' : index + 1 === current ? 'bg-ink' : 'bg-neutral-300',
              )}
            />
          ))}
        </div>
      </div>
      <ol aria-label="Pasos" className="hidden flex-wrap items-center gap-2.5 md:flex">
        {steps.map((label, index) => {
          const step = index + 1
          const isDone = step < current
          const isCurrent = step === current
          return (
            <li key={label} aria-current={isCurrent ? 'step' : undefined} className="flex items-center gap-2.5">
              <span
                className={cx(
                  'grid size-7 place-items-center rounded-full text-sm font-bold',
                  isDone && 'bg-success-solid text-bg',
                  isCurrent && 'bg-ink text-bg',
                  !isDone && !isCurrent && 'border-2 border-dashed border-neutral-600 text-ink-muted',
                )}
              >
                {isDone ? <Icon as={Check} size={15} strokeWidth={3.25} /> : step}
              </span>
              <span className={cx(isCurrent ? 'font-bold' : 'font-semibold', !isDone && !isCurrent && 'text-ink-muted')}>
                {label}
                {isDone && <span className="sr-only"> (completado)</span>}
              </span>
              {step < steps.length && <span aria-hidden="true" className="h-0.5 w-10 rounded bg-neutral-400" />}
            </li>
          )
        })}
      </ol>
    </>
  )
}

export type StepState = 'done' | 'current' | 'delayed' | 'todo'
export type TimelineStep = { readonly label: string; readonly state: StepState }

const STATE_LABEL: Readonly<Record<StepState, string>> = {
  done: 'Completado',
  current: 'En curso',
  delayed: 'Demorado',
  todo: 'Pendiente',
}
const DOTS: Readonly<Record<StepState, readonly [string, LucideIcon | null]>> = {
  done: ['bg-success-solid text-bg', Check],
  current: ['border-[1.5px] border-dashed border-pending-border bg-pending-bg text-pending', Clock],
  delayed: ['border-[1.5px] border-warning-border bg-warning-bg text-warning', Hourglass],
  todo: ['border-2 border-dashed border-neutral-500', null],
}

/** Creada → Procesando → Acreditada; each step's state is written, not only drawn. */
export function StatusTimeline({ steps, label }: { steps: readonly TimelineStep[]; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {steps.map((step, index) => {
        const [dotClass, DotIcon] = DOTS[step.state]
        const isActive = step.state === 'current' || step.state === 'delayed'
        return (
          <li key={step.label} aria-current={isActive ? 'step' : undefined} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
            <div className="flex flex-col items-center">
              <span className={cx('grid size-7 shrink-0 place-items-center rounded-full', dotClass)}>
                {DotIcon && <Icon as={DotIcon} size={14} strokeWidth={step.state === 'done' ? 3.25 : 2.75} />}
              </span>
              {index < steps.length - 1 && <span className="my-1 min-h-4 w-0.5 flex-1 bg-neutral-400" />}
            </div>
            <span className="pb-4 pt-0.5 font-bold">
              {step.label} <span className="text-caption font-semibold text-ink-soft">· {STATE_LABEL[step.state]}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
