import { useCallback, useEffect, useRef, useState } from 'react'
import { onAppResume } from '../appResume'

interface QueryState<T> {
  data: T | undefined
  loading: boolean
  error: Error | undefined
  refetch: () => void
}

// Minimal fetch-on-mount hook - deliberately not a caching library, the app
// is small enough that per-screen refetching is fine. Also refetches when the
// app comes back after a while (lib/appResume.ts) - quietly, keeping what's
// on screen until the new data arrives.
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[]): QueryState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [tick, setTick] = useState(0)
  const quiet = useRef(false)

  const run = useCallback(() => {
    let cancelled = false
    const isQuiet = quiet.current
    quiet.current = false
    if (!isQuiet) {
      setLoading(true)
      setError(undefined)
    }
    fn()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: Error) => {
        // A failed quiet refresh (offline) keeps the data that's shown.
        if (!cancelled && !isQuiet) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  useEffect(() => run(), [run])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(
    () =>
      onAppResume(() => {
        quiet.current = true
        setTick((t) => t + 1)
      }),
    [],
  )

  return { data, loading, error, refetch }
}
