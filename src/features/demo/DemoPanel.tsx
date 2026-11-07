import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Icon } from '@/shared/ui/Icon'
import { cx } from '@/shared/ui/cx'
import type { DemoStore } from './demoState'
import { DEMO_SCENARIOS } from './scenarios'

const GROUPS = [...new Set(DEMO_SCENARIOS.map((scenario) => scenario.group))]

export default function DemoPanel({ store }: { store: DemoStore }) {
  const { open, faults } = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const panelRef = useRef<HTMLElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const count = faults.length
  const activeLabel = `${count} ${count === 1 ? 'escenario activo' : 'escenarios activos'}`

  useLayoutEffect(() => {
    const visible = open ? panelRef.current : count > 0 ? stripRef.current : null
    const measure = () => {
      document.documentElement.style.setProperty('--demo-panel-h', `${visible?.getBoundingClientRect().height ?? 0}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (visible) observer.observe(visible)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--demo-panel-h')
    }
  }, [open, count])

  useEffect(() => {
    if (!open) return
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      if (origin?.isConnected) origin.focus({ preventScroll: true })
      else document.getElementById('demo-reopen')?.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <>
      <section
        ref={panelRef}
        aria-label="Herramientas de demostración"
        aria-hidden={!open}
        inert={!open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            store.closePanel()
          }
        }}
        className={cx(
          'fixed inset-x-0 top-0 z-40 max-h-[60dvh] overflow-y-auto overscroll-contain bg-paper text-ink transition-transform duration-200 ease-out motion-reduce:transition-none',
          open ? 'translate-y-0 shadow-lg' : '-translate-y-full',
        )}
      >
        <div className="mx-auto max-w-content px-4 pb-4 md:px-10">
          <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-paper py-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-title">Modo de demostración</h2>
              <p aria-live="polite" className="text-caption text-ink-muted">{activeLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="md" disabled={count === 0} onClick={store.turnOffAll}>
                Apagar todo
              </Button>
              <Button ref={closeRef} variant="icon" aria-label="Cerrar panel de demostración" icon={X} onClick={store.closePanel} />
            </div>
          </header>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {GROUPS.map((group) => (
              <fieldset key={group} className="min-w-0">
                <legend className="mb-1 text-label font-bold text-ink-soft">{group}</legend>
                <div className="flex flex-col">
                  {DEMO_SCENARIOS.filter((scenario) => scenario.group === group).map((scenario) => (
                    <label key={scenario.id} className="flex min-h-11 cursor-pointer items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-surface">
                      <span className="min-w-0">
                        <span className="block text-label">{scenario.label}</span>
                        {scenario.hint && <span id={`demo-hint-${scenario.id}`} className="mt-1 block text-caption text-ink-muted">{scenario.hint}</span>}
                      </span>
                      <span className="relative mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          role="switch"
                          aria-label={scenario.label}
                          aria-describedby={scenario.hint ? `demo-hint-${scenario.id}` : undefined}
                          checked={faults.includes(scenario.id)}
                          onChange={() => store.toggleFault(scenario.id)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className="relative block h-6 w-10 rounded-pill border border-neutral-600 bg-bg after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-ink-soft after:transition-transform peer-checked:border-primary peer-checked:bg-primary peer-checked:after:translate-x-4 peer-checked:after:bg-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus motion-reduce:after:transition-none"
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      </section>
      {!open && count > 0 && (
        <div ref={stripRef} aria-label="Simulación activa" className="fixed inset-x-0 top-0 z-40 border-b border-warning-border bg-warning-bg text-warning">
          <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-3 px-4 py-1 md:px-10">
            <span className="inline-flex items-center gap-2 text-sm font-bold"><Icon as={SlidersHorizontal} size={16} />Simulación activa</span>
            <span className="text-caption">{activeLabel}</span>
            <div className="ml-auto flex items-center gap-1">
              <Button id="demo-reopen" variant="ghost" size="md" className="text-warning" aria-label="Abrir panel de demostración" onClick={store.togglePanel}>Abrir panel</Button>
              <Button variant="ghost" size="md" className="text-warning" onClick={store.turnOffAll}>Apagar todo</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
