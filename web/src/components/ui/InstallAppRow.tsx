import { useState } from 'react'
import { SettingsRow } from './SettingsRow'
import { Modal } from './Modal'
import { Button } from './Button'
import { INSTALL_INSTRUCTIONS, isRunningInstalled, requestInstall } from '../../lib/install'

// Profile row "Přidat Muzio na plochu". Opens the browser's install dialog
// where there is one, otherwise explains how to do it by hand (Safari).
// Hidden when Muzio already runs as the installed app.
export function InstallAppRow({ onInstalled }: { onInstalled?: () => void }) {
  const [instructions, setInstructions] = useState<string>()

  if (isRunningInstalled()) return null

  async function handleClick() {
    const result = await requestInstall()
    if (result === 'installed') onInstalled?.()
    else if (result !== 'dismissed') setInstructions(INSTALL_INSTRUCTIONS[result])
  }

  return (
    <>
      <SettingsRow label="Přidat Muzio na plochu" onClick={handleClick} />
      <Modal open={!!instructions} onClose={() => setInstructions(undefined)}>
        <div className="space-y-4">
          <h2 className="font-heading font-semibold text-lg">Muzio na ploše</h2>
          <p className="text-sm">{instructions}</p>
          <p className="text-text-muted text-xs">
            Muzio se pak otevře jako aplikace, bez lišty prohlížeče. Přihlášení zůstane stejné.
          </p>
          <Button className="w-full" onClick={() => setInstructions(undefined)}>
            Rozumím
          </Button>
        </div>
      </Modal>
    </>
  )
}
