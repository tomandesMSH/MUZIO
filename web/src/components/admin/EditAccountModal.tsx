import { useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { updateAccount } from '../../lib/data/adminUsers'
import { getErrorMessage } from '../../lib/errors'
import type { Profile } from '../../lib/data/types'

interface EditAccountModalProps {
  user: Pick<Profile, 'id' | 'full_name' | 'username'>
  onClose: () => void
  onSaved: () => void
}

// Admin renames an account (migration 0029). Mount only while open.
export function EditAccountModal({ user, onClose, onSaved }: EditAccountModalProps) {
  const [fullName, setFullName] = useState(user.full_name)
  const [username, setUsername] = useState(user.username ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const usernameChanged = username.trim().toLowerCase() !== (user.username ?? '')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(undefined)
    try {
      await updateAccount(user.id, fullName, username)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Uložení se nepovedlo, zkus to znovu.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="font-heading font-semibold text-lg">Upravit účet</h2>
        <label className="block">
          <div className="text-xs font-semibold text-text-muted mb-1.5">Celé jméno</div>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-text-muted mb-1.5">Přihlašovací jméno</div>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
            required
          />
          <p className="text-xs text-text-muted mt-1">Malá písmena bez diakritiky, číslice, tečka, pomlčka nebo podtržítko.</p>
        </label>
        {usernameChanged && (
          <p className="text-xs rounded-xl bg-coral-tint text-coral-dark p-3">
            Pak se bude přihlašovat novým jménem <strong className="font-mono">{username.trim().toLowerCase()}</strong> –
            nezapomeň mu to říct. Heslo zůstává stejné.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-coral-dark">
            {error}
          </p>
        )}
        <div className="flex gap-2.5">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            Uložit
          </Button>
        </div>
      </form>
    </Modal>
  )
}
