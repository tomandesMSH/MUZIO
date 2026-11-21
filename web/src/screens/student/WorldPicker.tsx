import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { WorldCover } from '../../components/world/WorldCover'
import { useAuth } from '../../lib/AuthProvider'
import { updateWorld } from '../../lib/data/profiles'
import { getErrorMessage } from '../../lib/errors'
import { DEFAULT_WORLD, WORLDS, type WorldId } from '../../lib/world'

// The pupil picks their musical world. Flames and phases stay, only the look
// of the world changes.
export function WorldPicker() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const [chosen, setChosen] = useState<WorldId>(profile?.world ?? DEFAULT_WORLD)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  if (!profile) return null

  async function save() {
    if (!profile) return
    setSaving(true)
    setError(undefined)
    try {
      await updateWorld(profile.id, chosen)
      refreshProfile()
      navigate('/student')
    } catch (err) {
      setError(getErrorMessage(err, 'Zkus to prosím znovu.'))
      setSaving(false)
    }
  }

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link to="/student" className="text-sm text-text-muted hover:text-text-primary">
          Zpět na nástěnku
        </Link>
        <div>
          <h1 className="text-xl">Vyber si svůj hudební svět</h1>
          <p className="text-sm text-text-muted mt-1">Za každý den cvičení v něm přibude kousek.</p>
        </div>
        <div role="radiogroup" aria-label="Hudební svět" className="grid grid-cols-2 gap-3">
          {WORLDS.map((w) => {
            const selected = w.id === chosen
            return (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setChosen(w.id)}
                className={`flex flex-col items-center rounded-2xl bg-bg-card p-4 text-center shadow-clay-sm transition active:scale-[0.98] border-2 ${
                  selected ? 'border-coral' : 'border-transparent hover:border-border'
                }`}
              >
                <WorldCover world={w.id} className="h-20 w-20 sm:h-24 sm:w-24" />
                <span className="mt-2 font-heading font-semibold text-sm">{w.name}</span>
                <span className="text-xs text-text-muted mt-0.5">{w.tagline}</span>
              </button>
            )
          })}
        </div>
        {error && <p className="text-sm text-coral-dark">Svět se nepovedlo uložit: {error}</p>}
        <div className="flex flex-col items-center gap-2">
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Ukládám…' : 'Vstoupit do svého světa'}
          </Button>
          <p className="text-xs text-text-muted">Plamínky i odznaky ti zůstanou, mění se jen podoba světa.</p>
        </div>
      </div>
    </AppShell>
  )
}
