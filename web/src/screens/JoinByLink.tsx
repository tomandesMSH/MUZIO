import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../lib/AuthProvider'
import { joinClassroom } from '../lib/data/classrooms'
import { getErrorMessage } from '../lib/errors'

// The class link (Učebny -> Žáci -> Pozvat): /pripojit/<kód>. A signed-in
// pupil joins straight away; anyone else signs in (or registers) first - the
// code waits in this browser and Login brings them back here.

const PENDING_KEY = 'muzio-join-code'

export function rememberJoinCode(code: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, code)
  } catch {
    // Private mode: they type the code in Třídy instead.
  }
}

// Read once, after signing in.
export function takeJoinCode(): string | null {
  try {
    const code = sessionStorage.getItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    return code
  } catch {
    return null
  }
}

export function JoinByLink() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { session, profile, loading } = useAuth()
  const [state, setState] = useState<{ kind: 'joining' } | { kind: 'done' } | { kind: 'error'; text: string }>({
    kind: 'joining',
  })
  const started = useRef(false)

  const isPupil = profile?.role === 'student'

  useEffect(() => {
    if (loading || !session || !isPupil || started.current) return
    started.current = true
    joinClassroom(code)
      .then(() => setState({ kind: 'done' }))
      .catch((err) => setState({ kind: 'error', text: getErrorMessage(err, 'Připojení se nepovedlo. Odkaz možná už neplatí.') }))
  }, [loading, session, isPupil, code])

  if (loading) return null
  if (!session) {
    rememberJoinCode(code)
    return <Navigate to="/login" replace />
  }
  if (!profile) return null

  return (
    <div className="max-w-sm mx-auto p-6 pt-20 text-center space-y-4">
      <h1 className="text-2xl font-heading font-bold">Muzio</h1>
      {!isPupil ? (
        <p className="text-sm text-text-muted">Tenhle odkaz je pro žáky: připojí je do třídy. Pošli ho svým žákům.</p>
      ) : state.kind === 'joining' ? (
        <p className="text-sm text-text-muted">Připojuji tě do třídy…</p>
      ) : state.kind === 'done' ? (
        <>
          <p className="text-lg font-heading font-semibold">Jsi ve třídě 🎉</p>
          <p className="text-sm text-text-muted">Úkoly od učitele teď uvidíš na nástěnce a v Třídách.</p>
        </>
      ) : (
        <p className="text-sm text-coral-dark">{state.text}</p>
      )}
      <Button className="w-full" onClick={() => navigate(isPupil ? '/student/classes' : '/login', { replace: true })}>
        {isPupil ? 'Moje třídy' : 'Pokračovat'}
      </Button>
    </div>
  )
}
