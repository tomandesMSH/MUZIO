import { buildPracticeCalendar, type CalendarDay, type CalendarLog } from '../../lib/practiceCalendar'

const LEVEL_CLASS: Record<CalendarDay['level'], string> = {
  0: 'bg-bg-card-alt',
  1: 'bg-coral/25',
  2: 'bg-coral/50',
  3: 'bg-coral/75',
  4: 'bg-coral',
}

// "v listopadu" - the month after "v".
const IN_MONTH = ['lednu', 'únoru', 'březnu', 'dubnu', 'květnu', 'červnu', 'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci']

const DAY_LABELS = ['Po', '', 'St', '', 'Pá', '', '']

function plural(n: number, one: string, few: string, many: string): string {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many
}

function describe(day: CalendarDay): string {
  const date = `${day.date.getDate()}. ${day.date.getMonth() + 1}.`
  if (day.recordings === 0) return `${date}: bez cvičení`
  return `${date}: ${day.recordings} ${plural(day.recordings, 'nahrávka', 'nahrávky', 'nahrávek')}, ${day.minutes} min`
}

// Profile: when the pupil practised over the last months, GitHub-style.
export function PracticeCalendar({ logs, today = new Date() }: { logs: CalendarLog[]; today?: Date }) {
  const cal = buildPracticeCalendar(logs, today)
  const todayKey = cal.weeks.flat().find((d) => d.date.toDateString() === today.toDateString())?.key
  const columns = { gridTemplateColumns: `1.5rem repeat(${cal.weeks.length}, minmax(0, 1fr))` }

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        <span>
          <b className="text-text-primary">{cal.longestStreak}</b> {plural(cal.longestStreak, 'den', 'dny', 'dní')} nejdelší série
        </span>
        <span>
          <b className="text-text-primary">{cal.currentMonthMinutes}</b> min v {IN_MONTH[today.getMonth()]}
        </span>
        <span>
          <b className="text-text-primary">{cal.activeDays}</b> {plural(cal.activeDays, 'den', 'dny', 'dní')} cvičení za poslední měsíce
        </span>
      </div>

      <div className="space-y-[3px]" role="img" aria-label={`Kalendář cvičení: ${cal.activeDays} dní s nahrávkou, nejdelší série ${cal.longestStreak}`}>
        <div className="grid gap-[3px] text-[9px] text-text-muted" style={columns} aria-hidden="true">
          <span />
          {cal.weeks.map((_, w) => (
            <span key={w} className="whitespace-nowrap overflow-visible">
              {cal.monthLabels.find((l) => l.column === w)?.label ?? ''}
            </span>
          ))}
        </div>
        {DAY_LABELS.map((label, d) => (
          <div key={d} className="grid gap-[3px]" style={columns}>
            <span className="text-[9px] leading-none text-text-muted self-center" aria-hidden="true">
              {label}
            </span>
            {cal.weeks.map((week) => {
              const day = week[d]
              return (
                <span
                  key={day.key}
                  title={day.future ? undefined : describe(day)}
                  className={`aspect-square rounded-[3px] ${day.future ? 'opacity-0' : LEVEL_CLASS[day.level]} ${
                    day.key === todayKey ? 'ring-1 ring-text-muted' : ''
                  }`}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1 text-[10px] text-text-muted" aria-hidden="true">
        méně
        {([0, 1, 2, 3, 4] as const).map((l) => (
          <span key={l} className={`w-2.5 h-2.5 rounded-[3px] ${LEVEL_CLASS[l]}`} />
        ))}
        více
      </div>
    </div>
  )
}
