/** Outcome of an expected validation: no exceptions for invalid input. */
export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }
