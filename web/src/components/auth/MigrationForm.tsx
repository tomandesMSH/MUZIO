import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PasswordInput } from '../ui/PasswordInput'
import { completeMigration, requestMigrationCode, type MigrationSummary } from '../../lib/migration'
import { needsGuardianConsent } from '../../lib/consent'
import { signIn } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'
import { flamesLabel } from '../../lib/flames'

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-text-muted mb-1.5">{children}</div>
}

// Login -> Migrace: a pupil from the Base44 app moves to Muzio with their
// flames, stars and badges. 1) the old e-mail gets a code, 2) with the code
// they choose a username and password, 3) done, signed in.
export function MigrationForm() {
  const [step, setStep] = useState<'email' | 'details' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [info, setInfo] = useState<string>()
  const [summary, setSummary] = useState<MigrationSummary>()

  const isMinor = dateOfBirth ? needsGuardianConsent(dateOfBirth) : false

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    setError(undefined)
    setInfo(undefined)
    try {
      await requestMigrationCode(email)
      setStep('details')
      setInfo(`Kód jsme poslali na ${email.trim()}. Platí 15 minut, podívej se i do spamu.`)
    } catch (err) {
      setError(getErrorMessage(err, 'Kód se nepovedlo poslat.'))
    } finally {
      setBusy(false)
    }
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault()
    if (password !== password2) {
      setError('Hesla se neshodují.')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      const result = await completeMigration({
        email,
        code,
        username,
        fullName,
        password,
        dateOfBirth,
        guardianName: isMinor ? guardianName : undefined,
      })
      setSummary(result)
      setStep('done')
    } catch (err) {
      setError(getErrorMessage(err, 'Přenos se nepovedl.'))
    } finally {
      setBusy(false)
    }
  }

  async function enter() {
    setBusy(true)
    setError(undefined)
    try {
      await signIn(username.trim().toLowerCase(), password)
      // AuthProvider picks up the session and Login redirects.
    } catch (err) {
      setError(getErrorMessage(err, 'Přihlášení se nepovedlo, zkus se přihlásit novým jménem a heslem.'))
      setBusy(false)
    }
  }

  if (step === 'done' && summary) {
    return (
      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-lg">Hotovo, vítej v Muziu</h2>
        <p className="text-sm text-text-muted">
          Přeneseno: {flamesLabel(summary.flames)}, hvězdy {summary.stars}, odznaky {summary.badges}
          {summary.messages ? `, zprávy od paní učitelky ${summary.messages}` : ''}. Přihlašuj se
          teď jménem <strong className="text-text-primary">{username.trim().toLowerCase()}</strong> a svým heslem.
        </p>
        {error && (
          <p role="alert" className="text-sm text-coral-dark">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={busy} onClick={enter}>
          Pokračovat do Muzia
        </Button>
      </div>
    )
  }

  if (step === 'email') {
    return (
      <form className="space-y-4" onSubmit={sendCode}>
        <p className="text-sm text-text-muted">
          Cvičil(a) jsi v předchozí aplikaci paní učitelky? Zadej e-mail, kterým ses do ní přihlašoval(a). Pošleme na
          něj kód a tvoje plamínky, hvězdy a odznaky přeneseme do nového účtu v Muziu.
        </p>
        <div>
          <Label>E-mail z předchozí aplikace</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        {error && (
          <p role="alert" className="text-sm text-coral-dark">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy || !email.includes('@')}>
          {busy ? 'Posílám…' : 'Poslat kód'}
        </Button>
        <p className="text-xs text-text-muted">E-mail používáme jen k ověření, v Muziu se neukládá.</p>
      </form>
    )
  }

  return (
    <form className="space-y-4" onSubmit={finish}>
      {info && <p className="text-sm text-text-muted">{info}</p>}
      <div>
        <Label>Kód z e-mailu</Label>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          required
        />
      </div>
      <div>
        <Label>Celé jméno</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div>
        <Label>Uživatelské jméno pro Muzio (bez diakritiky)</Label>
        <Input
          placeholder="napr. tomask"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </div>
      <div>
        <Label>Nové heslo</Label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
      </div>
      <div>
        <Label>Heslo znovu</Label>
        <PasswordInput
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <Label>Datum narození</Label>
        <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
      </div>
      {dateOfBirth && isMinor && (
        <div>
          <Label>Jméno zákonného zástupce</Label>
          <Input
            placeholder="Jméno rodiče/opatrovníka"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            required
          />
        </div>
      )}
      {dateOfBirth && (
        <label className="flex items-start gap-2.5 text-xs text-text-muted">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span>
            {isMinor
              ? 'Jako zákonný zástupce potvrzuji souhlas se zpracováním osobních údajů dítěte (jméno, audio nahrávky, pokrok) v appce Muzio.'
              : 'Souhlasím se zpracováním svých osobních údajů (jméno, audio nahrávky, pokrok) v appce Muzio.'}
          </span>
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-coral-dark">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Přenáším…' : 'Přenést a vytvořit účet'}
      </Button>
      <button
        type="button"
        className="w-full text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
        disabled={busy}
        onClick={() => sendCode()}
      >
        Kód nepřišel? Poslat nový
      </button>
    </form>
  )
}
