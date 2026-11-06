import { createContext, useContext } from 'react'
import type { ToastMessage } from '@/shared/ui/Feedback'

export type ToastState = {
  /** The toast on screen; the rest wait in line. */
  readonly current: ToastMessage | null
  readonly show: (toast: ToastMessage) => void
  readonly dismiss: () => void
}

export const ToastContext = createContext<ToastState | null>(null)

export function useToastState(): ToastState {
  const state = useContext(ToastContext)
  if (!state) throw new Error('Toasts must be used inside ToastProvider')
  return state
}

/** Queues a toast; one is visible at a time and each closes by itself. */
export function useToast(): ToastState['show'] {
  return useToastState().show
}
