import { useState } from 'react'
import { Button } from '../ui/Button'
import { INVITE_ROLE_NAMES, schoolLink, type SchoolInvite } from '../../lib/data/schools'

// One open link: copy it, or cancel it. Admin -> Školy and Správa školy.
export function InviteRow({ invite, busy, onCancel }: { invite: SchoolInvite; busy: boolean; onCancel: () => void }) {
  const link = schoolLink(invite.code)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // The link is selectable in the field.
    }
  }

  return (
    <li className="rounded-xl bg-bg-card-alt p-3 space-y-2">
      <div className="text-xs text-text-muted">
        Pro: <strong className="text-text-primary">{INVITE_ROLE_NAMES[invite.role]}</strong>
        {invite.expires_at && <> · platí do {new Date(invite.expires_at).toLocaleDateString('cs-CZ')}</>}
        {' · '}jednorázový
      </div>
      <input
        readOnly
        value={link}
        aria-label={`Odkaz pro ${INVITE_ROLE_NAMES[invite.role]}`}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg bg-bg-card px-3 py-2 text-xs text-text-primary outline-none"
      />
      <div className="flex gap-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? 'Zkopírováno' : 'Zkopírovat'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          Zrušit
        </Button>
      </div>
    </li>
  )
}
