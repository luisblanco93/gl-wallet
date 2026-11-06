import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Toast, type ToastMessage } from '@/shared/ui/Feedback'
import { ToastContext, useToastState } from './useToast'

export const TOAST_DURATION_MS = 6000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<readonly ToastMessage[]>([])
  const current = queue[0] ?? null

  const show = useCallback((toast: ToastMessage) => setQueue((waiting) => [...waiting, toast]), [])
  const dismiss = useCallback(() => setQueue((waiting) => waiting.slice(1)), [])

  useEffect(() => {
    if (!current) return
    const timer = setTimeout(dismiss, TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [current, dismiss])

  const state = useMemo(() => ({ current, show, dismiss }), [current, show, dismiss])
  return <ToastContext value={state}>{children}</ToastContext>
}

/** Always mounted, so screen readers announce each new toast. */
export function ToastRegion() {
  const { current, dismiss } = useToastState()
  return (
    <div
      aria-label="Notificaciones"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-20 flex justify-end md:bottom-6"
    >
      {current && <Toast {...current} onClose={dismiss} />}
    </div>
  )
}
