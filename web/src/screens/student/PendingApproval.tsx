import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../lib/AuthProvider'
import { signOut } from '../../lib/auth'
import { joinClassroom } from '../../lib/data/classrooms'
import { getErrorMessage } from '../../lib/errors'

// A pupil not approved yet. With the class code from their teacher they
// join the class and are approved right away (migration 0069); otherwise
// their teacher or the school admin approves them.
export function PendingApproval() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [checking, setChecking] = useState(false)
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string>()

  async function handleRefresh() {
    setChecking(true)
    refreshProfile()
    setTimeout(() => setChecking(false), 600)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setJoining(true)
    setError(undefined)
    try {
      await joinClassroom(code)
      refreshProfile()
    } catch (err) {
      setError(getErrorMessage(err, 'Připojit se nepovedlo. Zkontroluj kód.'))
    } finally {
      setJoining(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="max-w-sm md:max-w-md mx-auto p-6 pt-20 text-center space-y-5">
      <div className="text-4xl">⏳</div>
      <h1 className="text-xl">Čekáš na schválení</h1>
      <p className="text-text-muted text-sm">
        Máš od učitele kód třídy? Zadej ho a hned můžeš začít. Jinak tvůj účet schválí učitel nebo správce školy.
      </p>
      <form className="space-y-3" onSubmit={handleJoin}>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Kód třídy"
          aria-label="Kód třídy"
          autoCapitalize="characters"
          className="text-center tracking-widest"
        />
        {error && <p className="text-sm text-coral-dark">{error}</p>}
        <Button type="submit" className="w-full" disabled={joining || !code.trim()}>
          {joining ? 'Připojuji…' : 'Připojit se do třídy'}
        </Button>
      </form>
      <Button variant="ghost" className="w-full" onClick={handleRefresh} disabled={checking}>
        {checking ? 'Kontroluju…' : 'Zkontrolovat znovu'}
      </Button>
      <Button variant="ghost" className="w-full" onClick={handleLogout}>
        Odhlásit se
      </Button>
    </div>
  )
}
