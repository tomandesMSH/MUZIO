import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { buildPracticeCalendar, type CalendarDay, type CalendarLog } from '../../lib/practiceCalendar'

const LEVEL_CLASS: Record<CalendarDay['level'], string> = {
  0: 'bg-bg-card-alt',
  1: 'bg-coral/25',
  2: 'bg-coral/50',
  3: 'bg-coral/75',
  4: 'bg-coral',
}

// Squares at least the size of GitHub's (10 px, 3 px apart). The weeks that
// fit are shown (a year at most) and the squares grow to fill the width.
const CELL = 10
const GAP = 3
const LABEL_COLUMN = 26
const MIN_WEEKS = 8
const MAX_WEEKS = 53 // a year, like GitHub

// "v listopadu" - the month after "v".
const IN_MONTH = ['lednu', 'únoru', 'březnu', 'dubnu', 'květnu', 'červnu', 'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci']
// "5. listopadu"
const OF_MONTH = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince']
const WEEKDAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota']

const DAY_LABELS = ['Po', '', 'St', '', 'Pá', '', '']

function plural(n: number, one: string, few: string, many: string): string {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many
}

// The tooltip, like GitHub's "4 contributions on November 5th.":
// "2 nahrávky · 12 min" and "úterý 5. listopadu".
function dayInfo(day: CalendarDay): { what: string; when: string } {
  const when = `${WEEKDAYS[day.date.getDay()]} ${day.date.getDate()}. ${OF_MONTH[day.date.getMonth()]}`
  const what =
    day.recordings === 0
      ? 'Bez cvičení'
      : `${day.recordings} ${plural(day.recordings, 'nahrávka', 'nahrávky', 'nahrávek')} · ${day.minutes} min`
  return { what, when }
}

// As many weeks as fit the width with the smallest squares (a year at most).
function weeksFor(width: number): number {
  return Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, Math.floor((width - LABEL_COLUMN + GAP) / (CELL + GAP))))
}

interface Shown {
  day: CalendarDay
  // The square's centre and top, relative to the grid box.
  x: number
  y: number
}

// Profile: when the pupil practised, GitHub-style. Pointing at a day (or
// tapping it on a phone) shows what was practised that day.
export function PracticeCalendar({ logs, today = new Date() }: { logs: CalendarLog[]; today?: Date }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [weekCount, setWeekCount] = useState(18)
  const [width, setWidth] = useState(0)
  const [shown, setShown] = useState<Shown>()

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      setWidth(box.clientWidth)
      setWeekCount(weeksFor(box.clientWidth))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  // On a phone the info stays until the next tap - a tap elsewhere hides it.
  useEffect(() => {
    if (!shown) return
    function onDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setShown(undefined)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [shown])

  const cal = buildPracticeCalendar(logs, today, weekCount)
  const todayKey = cal.weeks.flat().find((d) => d.date.toDateString() === today.toDateString())?.key
  const byKey = new Map(cal.weeks.flat().map((d) => [d.key, d]))
  const columns = { gridTemplateColumns: `${LABEL_COLUMN - GAP}px repeat(${cal.weeks.length}, minmax(0, 1fr))`, gap: GAP }

  function show(target: EventTarget | null) {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>('[data-day]')
    const box = boxRef.current
    const day = el ? byKey.get(el.dataset.day ?? '') : undefined
    if (!el || !box || !day || day.future) return false
    const cell = el.getBoundingClientRect()
    const outer = box.getBoundingClientRect()
    setShown({ day, x: cell.left - outer.left + cell.width / 2, y: cell.top - outer.top })
    return true
  }

  const info = shown ? dayInfo(shown.day) : undefined
  // The bubble stays inside the box; its little arrow keeps pointing at the day.
  const bubbleLeft = shown ? Math.min(Math.max(shown.x, 80), Math.max(80, width - 80)) : 0

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
          <b className="text-text-primary">{cal.activeDays}</b> {plural(cal.activeDays, 'den', 'dny', 'dní')} cvičení v kalendáři
        </span>
      </div>

      <div
        ref={boxRef}
        className="relative"
        role="img"
        aria-label={`Kalendář cvičení: ${cal.activeDays} dní s nahrávkou, nejdelší série ${cal.longestStreak}`}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse' && !show(e.target)) setShown(undefined)
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setShown(undefined)
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' && !show(e.target)) setShown(undefined)
        }}
      >
        <div className="grid text-[11px] leading-none text-text-muted mb-1.5" style={columns} aria-hidden="true">
          <span />
          {cal.weeks.map((_, w) => (
            <span key={w} className="whitespace-nowrap overflow-visible">
              {cal.monthLabels.find((l) => l.column === w)?.label ?? ''}
            </span>
          ))}
        </div>
        {DAY_LABELS.map((label, d) => (
          <div key={d} className="grid" style={{ ...columns, marginBottom: d < 6 ? GAP : 0 }}>
            <span className="text-[11px] leading-none text-text-muted self-center" aria-hidden="true">
              {label}
            </span>
            {cal.weeks.map((week) => {
              const day = week[d]
              const active = shown?.day.key === day.key
              return (
                <span
                  key={day.key}
                  data-day={day.key}
                  className={`aspect-square rounded-[3px] ${day.future ? 'opacity-0' : LEVEL_CLASS[day.level]} ${
                    active ? 'ring-1 ring-text-primary' : day.key === todayKey ? 'ring-1 ring-text-muted' : ''
                  }`}
                />
              )
            })}
          </div>
        ))}

        {shown && info && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-center text-[11px] leading-tight text-cream shadow-lg"
            style={{ left: bubbleLeft, top: shown.y - 6 }}
          >
            <div className="font-semibold">{info.what}</div>
            <div className="opacity-75">{info.when}</div>
            <span
              aria-hidden
              className="absolute top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-ink"
              style={{ left: `calc(50% + ${shown.x - bubbleLeft}px)` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-text-muted">
        <span className="md:hidden">Klepni na den pro podrobnosti</span>
        <span className="hidden md:inline" />
        <span className="flex items-center gap-1" aria-hidden="true">
          méně
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className={`rounded-[3px] ${LEVEL_CLASS[l]}`} style={{ width: CELL + 1, height: CELL + 1 }} />
          ))}
          více
        </span>
      </div>
    </div>
  )
}
