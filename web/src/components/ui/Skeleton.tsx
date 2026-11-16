// Grey shapes where content is about to appear, instead of a "Načítám…" line
// that makes the page jump when the list arrives. Screen readers still hear
// that it's loading.
export function Skeleton({ rows = 3, height = 'h-16', className = '' }: { rows?: number; height?: string; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={`space-y-2 ${className}`}>
      <span className="sr-only">Načítám…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className={`${height} rounded-2xl bg-bg-card-alt animate-pulse motion-reduce:animate-none`}
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  )
}
