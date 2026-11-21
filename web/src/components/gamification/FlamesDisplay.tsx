import { FlameIcon } from './Flames'
import { flamesLabel } from '../../lib/flames'

// Flames in the header: days with a recording (they don't have to follow each
// other). Its own flame icon, so it doesn't look like the streak (🔥 = days
// in a row).
export function FlamesDisplay({ flames }: { flames: number }) {
  return (
    <div
      className="flex items-center gap-1 whitespace-nowrap rounded-full bg-bg-card text-text-primary px-3 py-1.5 text-xs font-heading font-semibold shadow-clay-sm"
      title={`Plamínky: ${flamesLabel(flames)}, za každý den s nahrávkou`}
      aria-label={`Plamínky: ${flames}`}
    >
      <FlameIcon lit className="h-4 w-4" />
      {flames}
    </div>
  )
}
