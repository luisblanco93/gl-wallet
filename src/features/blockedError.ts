/**
 * A mutation stopped before any request because a check failed (e.g. the debit rule).
 * `problem` says which check; the UI maps it to its own copy.
 */
export class BlockedError<P extends string> extends Error {
  readonly problem: P

  constructor(problem: P) {
    super(`Blocked before sending: ${problem}`)
    this.name = 'BlockedError'
    this.problem = problem
  }
}
