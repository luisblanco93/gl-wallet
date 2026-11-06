import { useEffect, useRef } from 'react'

/**
 * Movement rows that get focus back when the detail they opened closes. Call `focusRowOnClose`
 * before closing; the focus moves once the detail is gone from the screen.
 */
export function useReturnFocusToRow(isDetailOpen: boolean) {
  const rows = useRef(new Map<string, HTMLButtonElement>())
  const pendingId = useRef<string | null>(null)

  useEffect(() => {
    const id = pendingId.current
    if (isDetailOpen || id === null) return
    pendingId.current = null
    rows.current.get(id)?.focus()
  }, [isDetailOpen])

  return {
    registerRow: (id: string) => (element: HTMLButtonElement | null) => {
      if (element) rows.current.set(id, element)
      else rows.current.delete(id)
    },
    focusRowOnClose: (id: string) => {
      pendingId.current = id
    },
  }
}
