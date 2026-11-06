/** Placeholder brand from the handoff (circle with a "g" and the name); replace with the real logo. */
export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-primary font-display text-lg text-bg">
        g
      </span>
      <span className="font-display text-xl">Greelow</span>
    </span>
  )
}
