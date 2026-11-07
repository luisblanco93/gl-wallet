import { useContext, useRef } from 'react'
import { DemoToolsContext } from './DemoToolsContext'

/** The optional gesture keeps the production logo static when demo tools are unavailable. */
export function useDemoLogoTap(): (() => void) | undefined {
  const store = useContext(DemoToolsContext)
  const taps = useRef<{ start: number | null; count: number }>({ start: null, count: 0 })

  if (!store) return undefined
  return () => {
    const now = Date.now()
    const previous = taps.current
    const next = previous.start === null || now - previous.start > 2000
      ? { start: now, count: 1 }
      : { start: previous.start, count: previous.count + 1 }
    taps.current = next
    if (next.count === 5) {
      taps.current = { start: null, count: 0 }
      store.togglePanel()
    }
  }
}
