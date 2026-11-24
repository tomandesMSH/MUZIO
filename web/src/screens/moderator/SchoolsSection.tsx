import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import { useQuery } from '../../lib/data/useQuery'
import {
  cancelSchoolInvite,
  createSchool,
  createSchoolInvite,
  fetchOpenInvites,
  fetchSchools,
  type SchoolInvite,
  type SchoolInviteRole,
  type SchoolRow,
} from '../../lib/data/schools'
import { getErrorMessage } from '../../lib/errors'
import { InviteRow } from '../../components/schools/InviteRow'

// Admin -> Školy: founding a school and the links that bring in its admin
// and teachers (/skola/<kód>, migrations 0064, 0067).
export function SchoolsSection() {
  const schools = useQuery(() => fetchSchools(), [])
  const invites = useQuery(() => fetchOpenInvites(), [])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key)
    setError(undefined)
    try {
      await action()
      schools.refetch()
      invites.refetch()
    } catch (err) {
      setError(getErrorMessage(err, 'Nepovedlo se, zkus to znovu.'))
    } finally {
      setBusy(undefined)
    }
  }

  function found(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) return
    void run('create', async () => {
      await createSchool(name.trim())
      setName('')
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={found} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Název nové školy"
          aria-label="Název nové školy"
          maxLength={120}
        />
        <Button type="submit" className="shrink-0" disabled={busy === 'create' || name.trim().length < 2}>
          Založit školu
        </Button>
      </form>

      {error && <p className="text-sm text-coral-dark">{error}</p>}
      {schools.loading && !schools.data && <Skeleton rows={3} height="h-24" />}
      {schools.error && (
        <p className="text-sm text-coral-dark">
          Načtení se nepovedlo: {schools.error.message}. Jsou spuštěné migrace 0064 a 0067?
        </p>
      )}

      {(schools.data ?? []).map((school) => (
        <SchoolCard
          key={school.id}
          school={school}
          invites={(invites.data ?? []).filter((i) => i.school_id === school.id)}
          busy={busy}
          onInvite={(role) => run(`${school.id}-${role}`, () => createSchoolInvite(school.id, role))}
          onCancel={(invite) => run(invite.id, () => cancelSchoolInvite(invite.id))}
        />
      ))}
    </div>
  )
}

function SchoolCard({
  school,
  invites,
  busy,
  onInvite,
  onCancel,
}: {
  school: SchoolRow
  invites: SchoolInvite[]
  busy?: string
  onInvite: (role: SchoolInviteRole) => void
  onCancel: (invite: SchoolInvite) => void
}) {
  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
      <div>
        <div className="font-heading font-semibold">
          {school.name}
          {school.is_default && <span className="ml-2 text-xs font-normal text-text-muted">výchozí</span>}
        </div>
        <div className="text-xs text-text-muted">
          Učitelé: {school.teachers} · žáci: {school.pupils} · třídy: {school.classrooms}
        </div>
        <div className="text-xs text-text-muted">
          Správce: {school.admins.length ? school.admins.join(', ') : 'zatím nikdo'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy === `${school.id}-school_admin`} onClick={() => onInvite('school_admin')}>
          Odkaz pro správce
        </Button>
        <Button variant="secondary" disabled={busy === `${school.id}-teacher`} onClick={() => onInvite('teacher')}>
          Odkaz pro učitele
        </Button>
      </div>

      {invites.length > 0 && (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} busy={busy === invite.id} onCancel={() => onCancel(invite)} />
          ))}
        </ul>
      )}
    </div>
  )
}
