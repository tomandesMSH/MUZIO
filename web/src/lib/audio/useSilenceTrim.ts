import { useEffect, useState } from 'react'
import { trimSilence, type TrimmedTake } from './trim'

// Gives a take without the silence around it, worked out in the background.
// `pending` while it's being worked out; `trimmed` stays undefined when there
// was nothing worth cutting or the browser can't cut.
export function useSilenceTrim(blob: Blob | undefined): { pending: boolean; trimmed?: TrimmedTake } {
  const [result, setResult] = useState<{ blob: Blob; trimmed?: TrimmedTake }>()

  useEffect(() => {
    if (!blob) return
    let current = true
    void trimSilence(blob).then((trimmed) => {
      if (current) setResult({ blob, trimmed })
    })
    return () => {
      current = false
    }
  }, [blob])

  if (!blob) return { pending: false }
  if (result?.blob !== blob) return { pending: true }
  return { pending: false, trimmed: result.trimmed }
}
