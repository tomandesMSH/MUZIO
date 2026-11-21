// After sending: a note keeps flying off towards the teacher. With "reduce
// motion" the note just stays put.
export function SentOverlay({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" role="status" aria-live="polite">
      <div className="rounded-3xl bg-bg-card shadow-clay px-8 py-7 text-center animate-[picker-in_0.2s_ease-out]">
        <svg
          viewBox="0 0 48 48"
          className="mx-auto h-16 w-16 animate-[note-fly_1.2s_ease-in-out_infinite] motion-reduce:animate-none"
          aria-hidden
        >
          <path d="M20 34V10l18-5v22" stroke="#e14432" strokeWidth={3.5} fill="none" strokeLinejoin="round" />
          <path d="M20 10l18-5v6l-18 5Z" fill="#e14432" />
          <ellipse cx={14} cy={35} rx={7} ry={5.5} fill="#f95c4b" transform="rotate(-20 14 35)" />
          <ellipse cx={32} cy={28} rx={7} ry={5.5} fill="#f95c4b" transform="rotate(-20 32 28)" />
        </svg>
        <p className="mt-3 font-heading font-semibold text-lg">Nahrávka už letí k učiteli</p>
        <p className="text-sm text-text-muted mt-0.5">Nemusí to být dokonalé, každý pokrok se počítá.</p>
      </div>
    </div>
  )
}
