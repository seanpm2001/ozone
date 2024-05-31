import { DependencyList, useCallback, useMemo, useRef, useState } from 'react'

import { useSignaledEffect } from './useSignaledEffect'

export type Retry =
  | boolean
  | number
  | ((failureCount: number, err: unknown) => boolean)
export type Options = { retry?: Retry; retryDelay?: number }

export function useAsyncGetter<Value>(
  fn: (signal: AbortSignal) => Value | PromiseLike<Value>,
  deps?: DependencyList,
  opts?: Options,
) {
  const [value, setValue] = useState<Value | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadingRef = useRef(loading)
  const retry = useCallback(() => {
    if (!loadingRef.current) setCount((r) => r + 1)
  }, [])

  /* eslint-disable react-hooks/exhaustive-deps */
  const getter = useCallback(fn, deps || [])
  /* eslint-enable react-hooks/exhaustive-deps */

  const failureCount = useRef(0)

  const retryRef = useRef(opts?.retry)
  retryRef.current = opts?.retry

  const retryDelayRef = useRef(opts?.retryDelay)
  retryDelayRef.current = opts?.retryDelay

  useSignaledEffect(
    (signal) => {
      failureCount.current = 0
      setValue(undefined)
      setError(undefined)
      setLoading((loadingRef.current = true))

      const attempt = async () => {
        try {
          const value = await getter(signal)
          if (!signal.aborted) {
            setValue(value)
            setError(undefined)
            setLoading((loadingRef.current = false))
          }
        } catch (err) {
          if (!signal.aborted) {
            console.warn('Failed to get async value:', err)

            setError(
              err instanceof Error
                ? err
                : new Error('Failed to get', { cause: err }),
            )

            if (shouldRetry(err, failureCount.current++, retryRef.current)) {
              const timer = setTimeout(() => {
                cleanup()
                attempt()
              }, retryDelayRef.current ?? 1_000)
              const cleanup = () => {
                signal.removeEventListener('abort', cleanup)
                clearTimeout(timer)
              }
              // Cancel retry if the component unmounts
              signal.addEventListener('abort', cleanup)
            }
          }
        }
      }

      attempt()
    },
    [count, getter],
  )

  return useMemo(
    () => ({ value, error, loading, retry }),
    [value, error, loading, retry],
  )
}

function shouldRetry(err: unknown, failureCount: number, retry?: Retry) {
  switch (typeof retry) {
    case 'function':
      return retry(failureCount, err)
    case 'number':
      return failureCount < retry
    case 'boolean':
      return retry
    default:
      return true
  }
}
