// The little number on a menu icon ("5 recordings to grade").
export function NavBadge({ count, label }: { count: number | undefined; label: string }) {
  if (!count) return null
  return (
    <span
      className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10px] font-heading font-bold leading-[18px] text-center ring-2 ring-bg"
      aria-label={`${count} ${label}`}
      role="status"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
