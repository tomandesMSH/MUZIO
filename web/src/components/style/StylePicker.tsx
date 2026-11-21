import { useState } from 'react'
import { SlidingTabs } from '../ui/SlidingTabs'
import { useAuth } from '../../lib/AuthProvider'
import { STYLES, styleOf, updateStyle, type StyleId } from '../../lib/style'

// Pohádkový svět / Moderní studio. Switches right away and saves in the
// background; on a failed save it goes back and says so.
export function StylePicker({ onError }: { onError?: (message: string) => void }) {
  const { profile, refreshProfile } = useAuth()
  const [local, setLocal] = useState<StyleId>()
  if (!profile) return null
  const value = local ?? styleOf(profile.style)

  async function change(next: StyleId) {
    if (!profile || next === value) return
    setLocal(next)
    try {
      await updateStyle(profile.id, next)
      refreshProfile()
    } catch {
      setLocal(undefined)
      onError?.('Styl se nepovedlo uložit, zkus to znovu.')
    }
  }

  return <SlidingTabs tabs={STYLES} value={value} onChange={change} label="Vyber si svůj styl" />
}

