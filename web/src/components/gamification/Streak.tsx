// The day streak, with the streak freezes left this month (🧊).
export function Streak({ count, freezesAvailable }: { count: number; freezesAvailable?: number }) {
  return (
    <div
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-bg-card px-3 py-1.5 text-xs font-heading font-semibold shadow-clay-sm"
      title="Dny v řadě s nahrávkou"
    >
      <span aria-hidden className="inline-block animate-pulse motion-reduce:animate-none">
        🔥
      </span>
      {count}
      {!!freezesAvailable && (
        <span
          title={`${freezesAvailable}x zmrazení streaku k dispozici tento měsíc`}
          aria-label={`${freezesAvailable}x zmrazení streaku k dispozici`}
          className="ml-1 border-l border-border pl-2 text-sky-500"
        >
          🧊 {freezesAvailable}
        </span>
      )}
    </div>
  )
}
