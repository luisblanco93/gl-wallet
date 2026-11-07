import { useMutation, useQueryClient, type MutationKey } from '@tanstack/react-query'
import { useRef } from 'react'

/**
 * A mutation that is never retried and ignores `submit` while one is in flight. Two guards:
 * a ref set synchronously (React state could still read idle during a fast double click), and
 * the mutation cache by `mutationKey`, which outlives the component: leaving the screen and
 * coming back while the request is still running must not send it again.
 */
export function useSingleSubmitMutation<TData, TVariables>(options: {
  readonly mutationKey: MutationKey
  readonly mutationFn: (variables: TVariables) => Promise<TData>
  readonly onSuccess?: (data: TData) => Promise<unknown> | unknown
  /** A returned promise is awaited before the error is reported (e.g. a refetch). */
  readonly onError?: (error: Error) => Promise<unknown> | unknown
}) {
  const inFlight = useRef(false)
  const queryClient = useQueryClient()
  const { mutationKey, onSuccess, onError } = options
  const mutation = useMutation<TData, Error, TVariables>({
    mutationKey,
    mutationFn: options.mutationFn,
    onSuccess: onSuccess ? (data) => onSuccess(data) : undefined,
    onError: onError ? (error) => onError(error) : undefined,
    retry: 0,
  })

  /** These callbacks run after the hook's own (e.g. after the refetch), for screen feedback. */
  function submit(
    variables: TVariables,
    callbacks: { readonly onSuccess?: (data: TData) => void; readonly onError?: (error: Error) => void } = {},
  ): void {
    if (inFlight.current || queryClient.isMutating({ mutationKey }) > 0) return
    inFlight.current = true
    mutation.mutate(variables, {
      onSuccess: callbacks.onSuccess ? (data) => callbacks.onSuccess?.(data) : undefined,
      onError: callbacks.onError ? (error) => callbacks.onError?.(error) : undefined,
      onSettled: () => {
        inFlight.current = false
      },
    })
  }

  return { ...mutation, submit }
}
