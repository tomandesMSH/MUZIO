import { splitTimestamps } from '../../lib/timestamps'

// A comment with its times ("0:42") as buttons that play the recording from
// there. Without a player to jump in, the text stays plain.
export function TimedText({ text, onSeek }: { text: string; onSeek?: (seconds: number) => void }) {
  return (
    <>
      {splitTimestamps(text).map((part, i) =>
        'time' in part && onSeek ? (
          <button
            key={i}
            type="button"
            onClick={() => onSeek(part.time)}
            title={`Přehrát od ${part.label}`}
            className="mx-0.5 inline-flex items-center gap-0.5 rounded-full bg-coral-tint px-1.5 py-px align-baseline text-xs font-heading font-semibold text-coral-dark hover:bg-coral hover:text-white"
          >
            ▶ {part.label}
          </button>
        ) : (
          <span key={i}>{'text' in part ? part.text : part.label}</span>
        ),
      )}
    </>
  )
}
