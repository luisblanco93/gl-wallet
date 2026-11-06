import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

/**
 * Right-hand panel on a native modal `<dialog>`: the browser traps focus and turns Escape
 * into `cancel`. Escape, the backdrop and × all call `onClose`; the container restores focus.
 */
export function SidePanel({
  id,
  heading,
  closeLabel,
  onClose,
  children,
}: {
  id: string
  heading: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.hasAttribute('open')) dialog.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-heading`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // The content fills the dialog, so only a click on the backdrop targets the dialog itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-[480px] bg-bg p-0 text-ink shadow-lg backdrop:bg-neutral-900/45 md:rounded-l-xl"
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg py-3.5 pl-6 pr-3.5">
          <span id={`${id}-heading`} className="font-bold">
            {heading}
          </span>
          <Button variant="icon" aria-label={closeLabel} onClick={onClose}>
            <Icon as={X} size={20} />
          </Button>
        </div>
        <div className="flex flex-col gap-5.5 p-6">{children}</div>
      </div>
    </dialog>
  )
}
