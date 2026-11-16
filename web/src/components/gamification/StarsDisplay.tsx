// Stars are awarded by hand by the teacher (concerts, challenges).
export function StarsDisplay({ stars }: { stars: number }) {
  return (
    <div
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-bg-card text-text-primary px-3 py-1.5 text-xs font-heading font-semibold shadow-clay-sm"
      title="Hvězdy od učitele"
    >
      ⭐ {stars}
    </div>
  )
}
