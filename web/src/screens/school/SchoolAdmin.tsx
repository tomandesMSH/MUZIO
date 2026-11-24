import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { SlidingTabs } from '../../components/ui/SlidingTabs'
import { useAuth } from '../../lib/AuthProvider'
import { signOut } from '../../lib/auth'
import { useQuery } from '../../lib/data/useQuery'
import { fetchSchoolOverview, type SchoolOverview } from '../../lib/data/schoolAdmin'
import { cancelSchoolInvite, createSchoolInvite, fetchOpenInvites, type SchoolInvite } from '../../lib/data/schools'
import { getErrorMessage } from '../../lib/errors'
import { InviteRow } from '../../components/schools/InviteRow'

type Tab = 'teachers' | 'pupils' | 'classrooms'

// 1 třída, 2-4 třídy, 0 / 5+ tříd.
function count(n: number, one: string, few: string, many: string): string {
  return `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'teachers', label: 'Učitelé' },
  { id: 'pupils', label: 'Žáci' },
  { id: 'classrooms', label: 'Třídy' },
]

// Správa školy (/sprava-skoly): the school admin's panel, always just their
// own school (migrations 0067, 0068). Teachers come in through links made
// here; approving pupils and verifying teachers comes in step 6 of the plan.
export function SchoolAdmin() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('teachers')
  const overview = useQuery(() => fetchSchoolOverview(), [])
  const invites = useQuery(() => fetchOpenInvites(), [])

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const data = overview.data

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <button className="text-sm text-text-muted" onClick={() => navigate('/panel')}>
        ← Změnit panel
      </button>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl">Správa školy</h1>
          {data?.school && <p className="text-sm text-text-muted">{data.school.name}</p>}
        </div>
        <Button variant="ghost" onClick={handleLogout}>
          Odhlásit se
        </Button>
      </div>

      <SlidingTabs tabs={TABS} value={tab} onChange={setTab} label="Sekce správy školy" />

      {overview.loading && !data && <Skeleton rows={4} height="h-14" />}
      {overview.error && (
        <p className="text-sm text-coral-dark">Načtení se nepovedlo: {overview.error.message}. Je spuštěná migrace 0068?</p>
      )}

      {data && tab === 'teachers' && (
        <TeachersTab
          data={data}
          schoolId={profile?.school_id ?? data.school?.id ?? ''}
          invites={invites.data ?? []}
          onChanged={() => {
            invites.refetch()
            overview.refetch()
          }}
        />
      )}
      {data && tab === 'pupils' && <PupilsTab data={data} />}
      {data && tab === 'classrooms' && <ClassroomsTab data={data} />}
    </div>
  )
}

function TeachersTab({
  data,
  schoolId,
  invites,
  onChanged,
}: {
  data: SchoolOverview
  schoolId: string
  invites: SchoolInvite[]
  onChanged: () => void
}) {
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const teacherInvites = invites.filter((i) => i.role === 'teacher')

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key)
    setError(undefined)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'Nepovedlo se, zkus to znovu.'))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
        <h2 className="text-sm font-heading font-semibold">Pozvat učitele</h2>
        <p className="text-xs text-text-muted">
          Odkaz pošli jednomu učiteli. Zaregistruje se (nebo přihlásí) a je ve škole. Platí 14 dní.
        </p>
        <Button variant="secondary" disabled={busy === 'new'} onClick={() => run('new', () => createSchoolInvite(schoolId, 'teacher'))}>
          Nový odkaz pro učitele
        </Button>
        {error && <p className="text-sm text-coral-dark">{error}</p>}
        {teacherInvites.length > 0 && (
          <ul className="space-y-2">
            {teacherInvites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                busy={busy === invite.id}
                onCancel={() => run(invite.id, () => cancelSchoolInvite(invite.id))}
              />
            ))}
          </ul>
        )}
      </section>

      <ul className="rounded-2xl bg-bg-card shadow-clay-sm divide-y divide-border">
        {data.teachers.length === 0 && <li className="p-4 text-sm text-text-muted">Ve škole zatím nejsou žádní učitelé.</li>}
        {data.teachers.map((t) => (
          <li key={t.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm">
                {t.full_name}
                {t.is_school_admin && <span className="ml-2 text-xs font-normal text-text-muted">správce</span>}
              </div>
              <div className="text-xs text-text-muted">
                {t.username} · {count(t.classrooms, 'třída', 'třídy', 'tříd')}
              </div>
            </div>
            {!t.is_verified && <span className="text-xs font-semibold text-coral-dark">neověřený</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PupilsTab({ data }: { data: SchoolOverview }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const pupils = q ? data.pupils.filter((p) => p.full_name.toLowerCase().includes(q)) : data.pupils

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Hledat žáka"
        aria-label="Hledat žáka"
        className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-coral"
      />
      <p className="text-xs text-text-muted">Žáků ve škole: {data.pupils.length}</p>
      <ul className="rounded-2xl bg-bg-card shadow-clay-sm divide-y divide-border">
        {pupils.length === 0 && <li className="p-4 text-sm text-text-muted">Nikdo takový tu není.</li>}
        {pupils.map((p) => (
          <li key={p.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm">{p.full_name}</div>
              <div className="text-xs text-text-muted">
                {p.username} · {p.classrooms.length ? p.classrooms.join(', ') : 'bez třídy'}
              </div>
            </div>
            {p.is_banned ? (
              <span className="text-xs font-semibold text-coral-dark">pozastavený</span>
            ) : (
              !p.is_approved && <span className="text-xs font-semibold text-coral-dark">čeká na schválení</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ClassroomsTab({ data }: { data: SchoolOverview }) {
  return (
    <ul className="rounded-2xl bg-bg-card shadow-clay-sm divide-y divide-border">
      {data.classrooms.length === 0 && <li className="p-4 text-sm text-text-muted">Ve škole zatím nejsou žádné třídy.</li>}
      {data.classrooms.map((c) => (
        <li key={c.id} className="p-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-sm">{c.name}</div>
            <div className="text-xs text-text-muted">{c.teacher ?? 'Bez učitele'}</div>
          </div>
          <span className="text-xs text-text-muted tabular-nums">{count(c.members, 'žák', 'žáci', 'žáků')}</span>
        </li>
      ))}
    </ul>
  )
}
