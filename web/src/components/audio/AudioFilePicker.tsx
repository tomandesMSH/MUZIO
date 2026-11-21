import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { NoteForTeacher } from './NoteForTeacher'
import { AUDIO_FILE_ACCEPT, checkAudioFile, formatFileSize, readAudioDuration } from '../../lib/audio/audioFile'

export interface PickedAudio {
  file: File
  extension: string
  contentType: string
  // Seconds, null if the browser can't read it (then it counts as 1 minute).
  durationSeconds: number | null
  // The pupil's note for the teacher ('' = none).
  note: string
}

interface AudioFilePickerProps {
  disabled?: boolean
  onSend: (audio: PickedAudio) => void
}

// The second way to hand in practice (#1): a recording already saved on the
// phone or computer. Unlike the recorder it asks before sending, because it's
// easy to pick the wrong file.
export function AudioFilePicker({ disabled, onSend }: AudioFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPickedState] = useState<PickedAudio>()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [error, setError] = useState<string>()
  const [note, setNote] = useState('')
  // The object URL behind the <audio> preview, freed when replaced or on unmount.
  const previewRef = useRef<string | undefined>(undefined)

  function setPicked(next: PickedAudio | undefined) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = next ? URL.createObjectURL(next.file) : undefined
    setPreviewUrl(previewRef.current)
    setPickedState(next)
  }

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Let the same file be picked again after Zrušit.
    e.target.value = ''
    if (!file) return
    const check = checkAudioFile(file)
    if (!check.ok) {
      setPicked(undefined)
      setError(check.error)
      return
    }
    setError(undefined)
    const durationSeconds = await readAudioDuration(file)
    setPicked({ file, extension: check.extension, contentType: check.contentType, durationSeconds, note: '' })
  }

  return (
    <div className="flex flex-col items-center gap-3 pb-6">
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_FILE_ACCEPT}
        className="hidden"
        onChange={handleChange}
        data-testid="audio-file-input"
      />

      {picked ? (
        <div className="w-full rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
          <div className="text-sm">
            <div className="font-heading font-semibold break-all">{picked.file.name}</div>
            <div className="text-xs text-text-muted">{formatFileSize(picked.file.size)}</div>
          </div>
          {previewUrl && <audio controls src={previewUrl} className="w-full" />}
          <p className="text-xs text-text-muted">Poslechni si ji a pošli učiteli, když je to ta správná.</p>
          <NoteForTeacher value={note} onChange={setNote} />
          <div className="flex gap-2.5">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setPicked(undefined)}>
              Zrušit
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={disabled}
              onClick={() => {
                onSend({ ...picked, note })
                setNote('')
                setPicked(undefined)
              }}
            >
              Odeslat
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-2 text-sm text-text-muted underline underline-offset-2 hover:text-text-primary disabled:opacity-40"
          onClick={() => inputRef.current?.click()}
        >
          Odeslat nahrávku ze souboru
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-coral-dark text-center">
          {error}
        </p>
      )}
    </div>
  )
}

