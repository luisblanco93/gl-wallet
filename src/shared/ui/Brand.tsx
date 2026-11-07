/** Placeholder brand from the handoff; demo tools may opt in to an accessible logo gesture. */
export function Brand({ onClick }: { onClick?: () => void }) {
  const content = (
    <>
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-primary font-display text-lg text-bg">
        w
      </span>
      <span className="font-display text-xl">Wallet</span>
    </>
  )
  return onClick ? (
    <button type="button" aria-label="Wallet" onClick={onClick} className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-sm text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transform-none motion-reduce:transition-none">
      {content}
    </button>
  ) : <span className="flex items-center gap-2.5">{content}</span>
}
