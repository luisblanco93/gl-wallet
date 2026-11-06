import { useMutation } from '@tanstack/react-query'
import { useRef } from 'react'

/**
 * A mutation that is never retried and ignores `submit` while one is in flight. The guard
 * is a ref set synchronously: React state could still read idle during a fast double click.
 */
export function useSingleSubmitMutation<TData, TVariables>(options: {
  readonly mutationFn: (variables: TVariables) => Promise<TData>
  readonly onSuccess?: (data: TData) => Promise<unknown> | unknown
  /** A returned promise is awaited before the error is reported (e.g. a refetch). */
  readonly onError?: (error: Error) => Promise<unknown> | unknown
}) {
  const inFlight = useRef(false)
  const { onSuccess, onError } = options
  const mutation = useMutation<TData, Error, TVariables>({
    mutationFn: options.mutationFn,
    onSuccess: onSuccess ? (data) => onSuccess(data) : undefined,
    onError: onError ? (error) => onError(error) : undefined,
    retry: 0,
  })

  /** `onSuccess` here runs after the hook's own (e.g. after the refetch), for screen feedback. */
  function submit(variables: TVariables, callbacks: { readonly onSuccess?: (data: TData) => void } = {}): void {
    if (inFlight.current) return
    inFlight.current = true
    mutation.mutate(variables, {
      onSuccess: callbacks.onSuccess ? (data) => callbacks.onSuccess?.(data) : undefined,
      onSettled: () => {
        inFlight.current = false
      },
    })
  }

  return { ...mutation, submit }
}
