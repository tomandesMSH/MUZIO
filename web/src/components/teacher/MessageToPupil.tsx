import { useState } from 'react'
import { Button } from '../ui/Button'
import { useQuery } from '../../lib/data/useQuery'
import { deleteMessage, fetchMessagesTo, MESSAGE_MAX, sendMessage } from '../../lib/data/pupilMessages'
import { getErrorMessage } from '../../lib/errors'

// Hudební pošta on the pupil card: write to this one pupil, see what was sent
// and whether it was read (migration 0052).
export function MessageToPupil({ teacherId, studentId }: { teacherId: string; studentId: string }) {
  const messages = useQuery(() => fetchMessagesTo(studentId), [studentId])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>()

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    setError(undefined)
    try {
      await sendMessage(teacherId, studentId, body)
      setBody('')
      messages.refetch()
    } catch (err) {
      setError(getErrorMessage(err, 'Zprávu se nepovedlo poslat. Je spuštěná migrace 0052?'))
    } finally {
      setSending(false)
    }
  }

  async function remove(id: string) {
    try {
      await deleteMessage(id)
      messages.refetch()
    } catch (err) {
      setError(getErrorMessage(err, 'Smazání se nepovedlo.'))
    }
  }

  const mine = (messages.data ?? []).filter((m) => m.teacher_id === teacherId)

  return (
    <div className="space-y-2">
      <form onSubmit={send} className="rounded-2xl bg-bg-card shadow-clay-sm p-3.5 space-y-2">
        <textarea
          aria-label="Text zprávy"
          className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
          rows={2}
          maxLength={MESSAGE_MAX}
          placeholder="Např. Skvělá práce na stupnici, příště zkus tempo 90."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-muted">Žák dostane notifikaci a uvidí zprávu na nástěnce.</span>
          <Button type="submit" className="!px-4 !py-2 text-xs shrink-0" disabled={sending || !body.trim()}>
            Poslat
          </Button>
        </div>
        {error && <p className="text-xs text-coral-dark">{error}</p>}
      </form>
      {mine.map((m) => (
        <div key={m.id} className="rounded-xl bg-bg-card-alt p-3 text-sm">
          <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
            <span>
              {new Date(m.created_at).toLocaleString('cs-CZ')} · {m.read_at ? 'přečteno' : 'nepřečteno'}
            </span>
            <button type="button" className="text-coral-dark" onClick={() => remove(m.id)}>
              Smazat
            </button>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
        </div>
      ))}
    </div>
  )
}
