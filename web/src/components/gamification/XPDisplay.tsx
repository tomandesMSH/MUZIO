// XP comes from graded recordings and drives the level (migration 0024).
export function XPDisplay({ xp }: { xp: number }) {
  return (
    <div
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-coral text-cream px-3 py-1.5 text-xs font-heading font-semibold shadow-clay-sm"
      title="XP za ohodnocené nahrávky"
    >
      {xp} XP
    </div>
  )
}
