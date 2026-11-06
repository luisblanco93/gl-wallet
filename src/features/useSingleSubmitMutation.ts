import { useMutation } from '@tanstack/react-query'
import { useRef } from 'react'

/**
 * A mutation that is never retried and ignores `submit` while one is in flight. The guard
 * is a ref set synchronously: React state could still read idle during a fast double click.
 */
export function useSingleSubmitMutation<TData, TVariables>(options: {
  readonly mutationFn: (variables: TVariables) => Promise<TData>
  readonly onSuccess?: (data: TData) => Promise<unknown> | unknown
}) {
  const inFlight = useRef(false)
  const { onSuccess } = options
  const mutation = useMutation<TData, Error, TVariables>({
    mutationFn: options.mutationFn,
    onSuccess: onSuccess ? (data) => onSuccess(data) : undefined,
    retry: 0,
  })

  function submit(variables: TVariables): void {
    if (inFlight.current) return
    inFlight.current = true
    mutation.mutate(variables, {
      onSettled: () => {
        inFlight.current = false
      },
    })
  }

  return { ...mutation, submit }
}
