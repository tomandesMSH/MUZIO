import { useRef, useState } from 'react'
import { InfoTip } from '../ui/InfoTip'
import { ATTACHMENT_ACCEPT, KEYBOARD_UTILS_URL, validateAttachment } from '../../lib/attachments'
import { NavIcon } from '../layout/NavIcon'

interface AttachmentFieldProps {
  file: File | null
  onChange: (file: File | null) => void
}

// Optional: a score (PDF / photo, or MIDI / MusicXML) attached to a new assignment, for the
// student to practise in Keyboard Utils.
export function AttachmentField({ file, onChange }: AttachmentFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()

  function pick(picked: File | undefined) {
    if (!picked) return
    const problem = validateAttachment(picked)
    setError(problem ?? undefined)
    onChange(problem ? null : picked)
  }

  function clear() {
    onChange(null)
    setError(undefined)
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <div className="text-xs font-semibold text-text-muted mb-1.5 flex items-center gap-1.5">
        Noty (nepovinné)
        <InfoTip label="Jaké noty jde přiložit">
          <span className="block mb-1.5">
            <b>PDF</b> nebo <b>fotka not</b> (JPG, PNG): žák si je otevře v telefonu nebo počítači a cvičí podle nich.
          </span>
          <span className="block mb-1.5">
            Nebo soubor <b>MIDI</b> (.mid) či{' '}
            <b>MusicXML</b> (.musicxml, .mxl) - třeba export z MuseScore nebo Sibelia, nebo skladbu stáhnutou
            z Mutopia Project.
          </span>
          <span className="block mb-1.5">
            Žák si soubor u úkolu stáhne a otevře v aplikaci{' '}
            <a className="underline" href={KEYBOARD_UTILS_URL} target="_blank" rel="noopener noreferrer">
              Keyboard Utils
            </a>{' '}
            (zdarma pro Windows). Tam skladbu uvidí jako padající noty i notový zápis, může si ji zpomalit,
            opakovat těžká místa a procvičit v režimu učení - a pak úkol nahraje sem jako obvykle.
          </span>
          <span className="block text-text-muted">Bez souboru funguje úkol stejně jako dosud.</span>
        </InfoTip>
      </div>
      <input
        ref={input}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {file ? (
        <div className="flex items-center gap-2 rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-2.5 text-sm">
          <NavIcon name="lessons" className="w-4 h-4 shrink-0 text-text-muted" />
          <span className="truncate flex-1">{file.name}</span>
          <button type="button" className="text-text-muted text-xs hover:text-text-primary" onClick={clear}>
            Odebrat
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="w-full rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-bg-card-alt transition text-left"
          onClick={() => input.current?.click()}
        >
          + Přiložit noty (PDF, foto, MIDI, MusicXML)
        </button>
      )}
      {error && <p className="text-xs text-coral-dark mt-1.5">{error}</p>}
    </div>
  )
}
