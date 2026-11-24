import { Link } from 'react-router-dom'

// A pupil who isn't in any of the teacher's classrooms: the database doesn't
// let the teacher see their practice, so instead of empty sections (that look
// like a pupil who never practised) the card shows made-up content under a
// blur, and how to get access.

// Fixed "random" practice days, so the picture doesn't change on every render.
function fakeLevel(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453
  const r = x - Math.floor(x)
  return r < 0.55 ? 0 : r < 0.7 ? 1 : r < 0.82 ? 2 : r < 0.93 ? 3 : 4
}

const LEVEL_CLASS = ['bg-bg-card-alt', 'bg-coral/25', 'bg-coral/45', 'bg-coral/70', 'bg-coral']

function FakeCard() {
  return (
    <div aria-hidden className="pointer-events-none select-none blur-[6px] space-y-5">
      <div>
        <h2 className="text-sm font-heading font-semibold mb-2">Kalendář cvičení</h2>
        <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
          <div className="text-xs text-text-muted">
            <b className="text-text-primary">6</b> dní nejdelší série · <b className="text-text-primary">142</b> min v
            listopadu · <b className="text-text-primary">48</b> dní cvičení
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-hidden">
            {Array.from({ length: 7 * 40 }, (_, i) => (
              <div key={i} className={`h-3 w-3 rounded-sm ${LEVEL_CLASS[fakeLevel(i)]}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 text-sm">
        <div className="font-heading font-semibold">Hudební hrad</div>
        <div className="text-xs text-text-muted">Fáze 2 ze 4: Zdi · 17 plamínků</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-heading font-semibold mb-2">Úkoly</h2>
          {['Stupnice C dur', 'Ukolébavka', 'Etuda č. 3'].map((title) => (
            <div key={title} className="mb-2 rounded-xl bg-bg-card px-3 py-2 text-sm shadow-clay-sm">
              {title} <span className="text-xs text-text-muted">· hotovo</span>
            </div>
          ))}
        </div>
        <div>
          <h2 className="text-sm font-heading font-semibold mb-2">Poslední nahrávky</h2>
          {['18. 11.', '15. 11.', '12. 11.'].map((day) => (
            <div key={day} className="mb-2 flex justify-between rounded-xl bg-bg-card px-3 py-2 text-xs shadow-clay-sm">
              <span className="text-text-muted">{day}</span>
              <span>🎵🎵🎵🎵</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TITLE = 'K informacím tohoto žáka nemáš přístup'
const TEXT = 'Žák není v žádné z tvých tříd. Až ho do některé přidáš, uvidíš jeho cvičení, plamínky, úkoly i nahrávky.'

function Action({ hasClassrooms, className = '', linkClassName = '' }: { hasClassrooms: boolean; className?: string; linkClassName?: string }) {
  return (
    <p className={className}>
      {hasClassrooms ? 'Přidej ho do třídy ' : 'Založ si třídu '}
      <Link to="/teacher/classrooms" className={`font-semibold text-coral-dark underline underline-offset-4 ${linkClassName}`}>
        tady
      </Link>
      .
    </p>
  )
}

// Classic style: a card over the blur. Modern style (index.css,
// .locked-classic / .locked-modern): big thin text straight on it.
export function LockedPupil({ hasClassrooms }: { hasClassrooms: boolean }) {
  return (
    <div className="relative">
      <FakeCard />
      <div className="locked-classic absolute inset-0 flex items-start justify-center pt-10 px-2">
        <div className="max-w-sm rounded-2xl bg-bg-card shadow-clay p-5 text-center space-y-2">
          <div aria-hidden className="text-2xl">🔒</div>
          <h2 className="font-heading font-semibold">{TITLE}</h2>
          <p className="text-sm text-text-muted">{TEXT}</p>
          <Action hasClassrooms={hasClassrooms} className="text-sm" />
        </div>
      </div>
      <div className="locked-modern absolute inset-0 items-start justify-center pt-8 px-4">
        <div className="max-w-4xl text-center">
          <h2 className="font-heading font-extralight text-2xl md:text-4xl leading-tight tracking-tight md:whitespace-nowrap">{TITLE}</h2>
          <p className="mt-10 mx-auto max-w-xl font-light text-base md:text-lg text-text-muted">{TEXT}</p>
          <Action hasClassrooms={hasClassrooms} className="mt-4 font-light text-base md:text-lg" linkClassName="italic" />
        </div>
      </div>
    </div>
  )
}
