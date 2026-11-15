import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { PasswordInput } from './PasswordInput'
import { useAuth } from '../../lib/AuthProvider'
import { changeOwnPassword, reauthenticate } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'

interface ChangePasswordModalProps {
  onClose: () => void
  onChanged: () => void
}

const MIN_LENGTH = 6

// Mount only while open, so every open starts with empty fields.
export function ChangePasswordModal({ onClose, onChanged }: ChangePasswordModalProps) {
  const { session } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(undefined)
    if (next.length < MIN_LENGTH) return setError(`Nové heslo musí mít aspoň ${MIN_LENGTH} znaků.`)
    if (next !== repeat) return setError('Nová hesla se neshodují.')
    if (next === current) return setError('Nové heslo je stejné jako to současné.')
    const email = session?.user.email
    if (!email) return setError('Nejsi přihlášený, přihlas se prosím znovu.')

    setSubmitting(true)
    try {
      try {
        await reauthenticate(email, current)
      } catch {
        setError('Současné heslo není správné.')
        return
      }
      await changeOwnPassword(next)
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'Změna hesla se nepovedla, zkus to znovu.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="font-heading font-semibold text-lg">Změnit heslo</h2>
        <p className="text-text-muted text-sm">
          Hodí se hlavně po zapomenutém heslu: dočasné heslo od učitele si tu vyměníš za vlastní.
        </p>
        <label className="block">
          <div className="text-xs font-semibold text-text-muted mb-1.5">Současné heslo</div>
          <PasswordInput
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-text-muted mb-1.5">Nové heslo (aspoň {MIN_LENGTH} znaků)</div>
          <PasswordInput
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-text-muted mb-1.5">Nové heslo znovu</div>
          <PasswordInput
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-coral-dark">
            {error}
          </p>
        )}
        <div className="flex gap-2.5">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            Změnit heslo
          </Button>
        </div>
      </form>
    </Modal>
  )
}
