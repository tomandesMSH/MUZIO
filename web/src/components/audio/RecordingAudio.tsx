import type { Ref } from 'react'
import { AudioPlayer, type AudioPlayerHandle } from './AudioPlayer'

// A recording's player - or a note when its sound was cleared out to free
// storage (Admin -> Využití -> Úklid, migration 0034). The grade stays.
export function RecordingAudio({
  src,
  ref,
  onTime,
}: {
  src: string | null | undefined
  ref?: Ref<AudioPlayerHandle>
  onTime?: (seconds: number) => void
}) {
  if (!src) {
    return (
      <p className="rounded-xl bg-bg-card-alt px-3 py-2 text-xs text-text-muted">
        Zvuk nahrávky byl archivován, aby se uvolnilo místo. Hodnocení zůstává.
      </p>
    )
  }
  return <AudioPlayer src={src} ref={ref} onTime={onTime} />
}
