import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flames } from '../../components/gamification/Flames'
import { FlamesDisplay } from '../../components/gamification/FlamesDisplay'
import { Streak } from '../../components/gamification/Streak'
import { XPDisplay } from '../../components/gamification/XPDisplay'
import { StarsDisplay } from '../../components/gamification/StarsDisplay'
import { LevelProgress } from '../../components/gamification/LevelProgress'
import { WorldProgress } from '../../components/world/WorldProgress'
import { WorldScene } from '../../components/world/WorldScene'
import { WorldCover } from '../../components/world/WorldCover'
import { artFrameCount, artFramesReady } from '../../components/world/worldArt'
import { PupilFlames } from '../../components/teacher/PupilFlames'
import { PupilFlamesLine } from '../../components/teacher/PupilFlamesLine'
import { LockedPupil } from '../../components/teacher/LockedPupil'
import { FLAMES_PER_CYCLE, FLAMES_PER_PHASE, flameProgress } from '../../lib/flames'
import { WORLDS, type WorldId } from '../../lib/world'
import { accentShades } from '../../lib/accent'
import { ACCENTS } from '../../components/ui/CustomStyleModal'

// Admin -> Dev Playground: real parts of the app fed with made-up numbers,
// to try out how things look (a world's artwork at every flame, the
// styles...). Nothing is read from or saved to the database; the look
// switches only last while this page is open.

type Role = 'student' | 'teacher'
type Look = 'classic' | 'modern'

// Practice days for the teacher's flames card: `n` days back from today.
function fakeDayKeys(n: number): string[] {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i * 2)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

const ACCENT_PROPS = ['--color-coral', '--color-coral-dark', '--color-coral-tint'] as const

// The look of the page while the playground is open, put back afterwards
// (style, theme and the accent colour; accent null = the person's own).
function useTemporaryLook(look: Look, dark: boolean, accent: string | null) {
  const [before] = useState(() => {
    const root = document.documentElement
    return {
      style: root.dataset.style,
      dark: root.classList.contains('dark'),
      accent: ACCENT_PROPS.map((prop) => root.style.getPropertyValue(prop)),
    }
  })
  useEffect(() => {
    const root = document.documentElement
    return () => {
      if (before.style) root.dataset.style = before.style
      else delete root.dataset.style
      root.classList.toggle('dark', before.dark)
      ACCENT_PROPS.forEach((prop, i) => {
        if (before.accent[i]) root.style.setProperty(prop, before.accent[i])
        else root.style.removeProperty(prop)
      })
    }
  }, [before])
  useEffect(() => {
    const root = document.documentElement
    if (look === 'modern') root.dataset.style = 'modern'
    else delete root.dataset.style
    root.classList.toggle('dark', dark)
    if (accent) {
      const shades = accentShades(accent, { dark, base: look })
      root.style.setProperty('--color-coral', shades.fill)
      root.style.setProperty('--color-coral-dark', shades.strong)
      root.style.setProperty('--color-coral-tint', shades.tint)
    } else {
      ACCENT_PROPS.forEach((prop, i) => {
        if (before.accent[i]) root.style.setProperty(prop, before.accent[i])
        else root.style.removeProperty(prop)
      })
    }
  }, [look, dark, accent, before])
}

// A number you can type or slide.
function NumberField({ value, min, max, step = 1, onChange }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min))
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="min-w-0 flex-1 accent-coral"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-20 rounded-lg bg-bg-card-alt px-2 py-1 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
      />
    </div>
  )
}

// A group, not a <label>: a label passes a click anywhere inside it to its
// first control, so a click next to "Téma" switched the theme to light.
function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="space-y-1">
      <div className="text-xs font-heading font-semibold text-text-muted">{label}</div>
      {children}
    </div>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-bg-card-alt p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-heading font-semibold ${
            value === o.id ? 'bg-bg-card shadow-clay-sm text-text-primary' : 'text-text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Preview({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-heading font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      {children}
    </section>
  )
}

export function Playground() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('student')
  const [world, setWorld] = useState<WorldId>('hrad')
  const [flames, setFlames] = useState(10)
  const [cycles, setCycles] = useState(0)
  const [look, setLook] = useState<Look>(() => (document.documentElement.dataset.style === 'modern' ? 'modern' : 'classic'))
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [xp, setXp] = useState(240)
  const [streak, setStreak] = useState(3)
  const [stars, setStars] = useState(3)
  const [accent, setAccent] = useState<string | null>(null)
  useTemporaryLook(look, dark, accent)

  // `flames` is within the round; earlier finished worlds come on top.
  const total = cycles * FLAMES_PER_CYCLE + flames
  const progress = flameProgress(total)
  const frames = artFrameCount(world)

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <button className="text-sm text-text-muted" onClick={() => navigate('/moderator')}>
            ← Admin panel
          </button>
          <h1 className="text-xl">Dev Playground</h1>
          <p className="text-xs text-text-muted">Vymyšlená data, nic se neukládá. Vzhled platí jen na téhle stránce.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="space-y-4 rounded-2xl bg-bg-card p-4 shadow-clay-sm md:sticky md:top-4 md:self-start">
          <Control label="Zobrazit jako">
            <Segmented value={role} onChange={setRole} options={[{ id: 'student', label: 'Žák' }, { id: 'teacher', label: 'Učitel' }]} />
          </Control>
          <Control label="Svět">
            <select
              value={world}
              onChange={(e) => setWorld(e.target.value as WorldId)}
              className="w-full rounded-xl bg-bg-card-alt px-3 py-2 text-sm text-text-primary outline-none"
            >
              {WORLDS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {artFrameCount(w.id) ? ` (${artFramesReady(w.id).length} z ${artFrameCount(w.id)} obrázků)` : ' (bez grafiky)'}
                </option>
              ))}
            </select>
          </Control>
          <Control label={`Plamínky v kole: ${flames} z ${FLAMES_PER_CYCLE} (fáze ${progress.phasesDone})`}>
            <NumberField value={flames} min={0} max={FLAMES_PER_CYCLE} onChange={setFlames} />
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((phase) => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setFlames(phase * FLAMES_PER_PHASE)}
                  className="flex-1 rounded-lg bg-bg-card-alt py-1 text-[11px] text-text-muted hover:text-text-primary"
                >
                  F{phase}
                </button>
              ))}
            </div>
          </Control>
          <Control label="Hotové světy">
            <NumberField value={cycles} min={0} max={50} onChange={setCycles} />
          </Control>
          <Control label="Styl">
            <Segmented value={look} onChange={setLook} options={[{ id: 'classic', label: 'Klasický' }, { id: 'modern', label: 'Moderní' }]} />
          </Control>
          <Control label="Akcentová barva">
            <div className="flex flex-wrap items-center gap-1.5">
              {[{ hex: '#f95c4b', label: 'Korálová' }, ...ACCENTS].map((a) => (
                <button
                  key={a.hex}
                  type="button"
                  title={a.label}
                  aria-label={a.label}
                  aria-pressed={accent === a.hex}
                  onClick={() => setAccent(a.hex)}
                  className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-bg-card ${accent === a.hex ? 'ring-2 ring-text-primary' : ''}`}
                  style={{ background: a.hex }}
                />
              ))}
            </div>
          </Control>
          <Control label="Téma">
            <Segmented
              value={dark ? 'dark' : 'light'}
              onChange={(v) => setDark(v === 'dark')}
              options={[{ id: 'light', label: 'Světlé' }, { id: 'dark', label: 'Tmavé' }]}
            />
          </Control>
          {role === 'student' && (
            <>
              <Control label="XP">
                <NumberField value={xp} min={0} max={20000} step={1} onChange={setXp} />
              </Control>
              <Control label="Série (dní)">
                <NumberField value={streak} min={0} max={365} onChange={setStreak} />
              </Control>
              <Control label="Hvězdy">
                <NumberField value={stars} min={0} max={100} onChange={setStars} />
              </Control>
            </>
          )}
        </aside>

        <main className="min-w-0 space-y-8">
          {role === 'student' ? (
            <>
              <Preview title="Hlavička nástěnky">
                <div className="flex flex-wrap items-center gap-2">
                  <Streak count={streak} freezesAvailable={1} />
                  <FlamesDisplay flames={total} />
                  <XPDisplay xp={xp} />
                  <StarsDisplay stars={stars} />
                </div>
                <LevelProgress xp={xp} />
              </Preview>
              <Preview title="Plamínky">
                <div className="rounded-2xl bg-bg-card p-4 shadow-clay-sm">
                  <Flames progress={progress} />
                </div>
              </Preview>
              <Preview title="Můj svět (nástěnka)">
                <WorldProgress world={world} progress={progress} />
              </Preview>
            </>
          ) : (
            <>
              <Preview title="Řádek v seznamu žáků">
                <div className="rounded-2xl bg-bg-card p-4 text-xs text-text-muted shadow-clay-sm">
                  <PupilFlamesLine flames={total} world={world} />
                </div>
              </Preview>
              <Preview title="Karta žáka: plamínky a svět">
                <PupilFlames world={world} dayKeys={fakeDayKeys(total)} />
              </Preview>
              <Preview title="Zamčená karta žáka (mimo moje třídy)">
                <LockedPupil hasClassrooms />
              </Preview>
            </>
          )}

          <Preview title={frames ? `Všechny obrázky světa (${frames})` : 'Všechny obrázky světa'}>
            {frames ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: frames }, (_, i) => {
                  // The first flame count that shows picture i + 1.
                  const at = Array.from({ length: FLAMES_PER_CYCLE + 1 }, (_, f) => f).find(
                    (f) => Math.round((f * (frames - 1)) / FLAMES_PER_CYCLE) === i,
                  )
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => at !== undefined && setFlames(at)}
                      className="rounded-xl bg-bg-card p-2 text-center shadow-clay-sm"
                    >
                      <WorldScene world={world} phase={0} flamesInCycle={at ?? 0} className="w-full" />
                      <div className="mt-1 text-[11px] text-text-muted">
                        {i + 1}. obrázek · od {at ?? '?'} 🔥
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Tenhle svět ještě nemá grafiku.</p>
            )}
          </Preview>

          <Preview title="Výběr světa (obálky)">
            <div className="flex flex-wrap gap-4">
              {WORLDS.map((w) => (
                <button key={w.id} type="button" onClick={() => setWorld(w.id)} className="text-center">
                  <WorldCover world={w.id} className="h-20 w-20" />
                  <div className={`mt-1 text-[11px] ${w.id === world ? 'font-semibold text-coral-dark' : 'text-text-muted'}`}>{w.name}</div>
                </button>
              ))}
            </div>
          </Preview>
        </main>
      </div>
    </div>
  )
}
