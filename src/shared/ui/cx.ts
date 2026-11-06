/** Joins the class names that are set; enough for this app, so no `clsx` dependency. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
