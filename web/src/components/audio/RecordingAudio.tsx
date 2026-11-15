import { AudioPlayer } from './AudioPlayer'

// A recording's player - or a note when its sound was cleared out to free
// storage (Admin -> Využití -> Úklid, migration 0034). The grade stays.
export function RecordingAudio({ src }: { src: string | null | undefined }) {
  if (!src) {
    return (
      <p className="rounded-xl bg-bg-card-alt px-3 py-2 text-xs text-text-muted">
        🗄️ Zvuk nahrávky byl archivován, aby se uvolnilo místo. Hodnocení zůstává.
      </p>
    )
  }
  return <AudioPlayer src={src} />
}
