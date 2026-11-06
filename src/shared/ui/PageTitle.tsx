import { useEffect, useRef, type ReactNode } from 'react'

/** The page h1 (display font). It takes focus when the page mounts, so navigation is announced. */
export function PageTitle({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className="font-display text-[clamp(1.875rem,5cqw,2.5rem)] leading-[1.12] tracking-[-0.015em] outline-none"
    >
      {children}
    </h1>
  )
}
