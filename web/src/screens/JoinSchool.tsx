import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../lib/AuthProvider'
import { useQuery } from '../lib/data/useQuery'
import { fetchSchoolInviteInfo, INVITE_ROLE_NAMES, redeemSchoolInvite, rememberSchoolCode } from '../lib/data/schools'
import { getErrorMessage } from '../lib/errors'
import { hasPanelChoice } from '../lib/roles'

// The school link (Admin -> Školy): /skola/<kód>. Shows which school and
// role it is for; a teacher account takes it with one tap, anyone else
// signs in or registers as a teacher first (the code waits in this browser
// and Login brings them back here).
export function JoinSchool() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { session, profile, loading, refreshProfile } = useAuth()
  const info = useQuery(() => fetchSchoolInviteInfo(code), [code])
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'busy' } | { kind: 'done' } | { kind: 'error'; text: string }>({
    kind: 'idle',
  })

  function goToLogin(register: boolean) {
    rememberSchoolCode(code)
    navigate('/login', { state: register ? { mode: 'register', portal: 'teacher' } : undefined })
  }

  async function join() {
    setState({ kind: 'busy' })
    try {
      await redeemSchoolInvite(code)
      refreshProfile()
      setState({ kind: 'done' })
    } catch (err) {
      setState({ kind: 'error', text: getErrorMessage(err, 'Přidat se ke škole se nepovedlo.') })
    }
  }

  if (loading || info.loading) return null

  const invite = info.data
  const roleName = invite ? INVITE_ROLE_NAMES[invite.role] : ''
  const isTeacher = profile?.role === 'teacher'

  return (
    <div className="max-w-sm mx-auto p-6 pt-20 text-center space-y-4">
      <h1 className="text-2xl font-heading font-bold">MUZIO</h1>

      {info.error || !invite || !invite.valid ? (
        <p className="text-sm text-coral-dark">
          {info.error ? 'Pozvánku se nepovedlo načíst. Zkus to znovu.' : 'Pozvánka neplatí nebo už byla použitá. Požádej o nový odkaz.'}
        </p>
      ) : state.kind === 'done' ? (
        <>
          <p className="text-lg font-heading font-semibold">Jsi ve škole {invite.school_name} 🎉</p>
          <p className="text-sm text-text-muted">
            {invite.role === 'school_admin'
              ? 'Jsi správce školy. V panelu Správa školy pozveš další učitele.'
              : 'Teď si můžeš založit třídy a pozvat do nich žáky.'}
          </p>
          <Button className="w-full" onClick={() => navigate(invite.role === 'school_admin' || (profile && hasPanelChoice(profile)) ? '/panel' : '/teacher', { replace: true })}>
            Pokračovat
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm">
            Pozvánka do školy <strong>{invite.school_name}</strong> jako <strong>{roleName}</strong>.
          </p>

          {!session ? (
            <>
              <p className="text-sm text-text-muted">Přihlas se svým učitelským účtem, nebo si ho založ.</p>
              <Button className="w-full" onClick={() => goToLogin(true)}>
                Založit učitelský účet
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => goToLogin(false)}>
                Už mám účet, přihlásit se
              </Button>
            </>
          ) : !profile ? null : !isTeacher ? (
            <p className="text-sm text-text-muted">
              Tahle pozvánka je pro učitele. Odhlas se a přihlas se učitelským účtem, nebo si ho založ.
            </p>
          ) : (
            <>
              {state.kind === 'error' && <p className="text-sm text-coral-dark">{state.text}</p>}
              <Button className="w-full" disabled={state.kind === 'busy'} onClick={join}>
                {state.kind === 'busy' ? 'Přidávám…' : `Přidat se ke škole ${invite.school_name}`}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}
