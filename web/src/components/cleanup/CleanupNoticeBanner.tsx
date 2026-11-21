import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '../../lib/data/useQuery'
import { fetchOpenCleanupNotices, noticeDay } from '../../lib/data/cleanupNotices'

// The pupil's dashboard: old recordings are about to be cleared, save the
// ones you care about. Nothing shows without an open notice (or before
// migration 0046 - the query just fails quietly).
export function CleanupNoticeBanner() {
  const [today] = useState(() => new Date())
  const notices = useQuery(() => fetchOpenCleanupNotices(today).catch(() => []), [])
  const notice = notices.data?.[0]
  if (!notice) return null

  return (
    <div className="rounded-2xl border-l-4 border-coral bg-bg-card shadow-clay-sm p-3.5 text-sm" role="status">
      <p className="font-heading font-semibold">
        {notice.kind === 'all'
          ? `Od ${noticeDay(notice.delete_after)} budeme mazat staré nahrávky`
          : `Od ${noticeDay(notice.delete_after)} smažeme některé tvoje nahrávky`}
      </p>
      <p className="mt-0.5 text-text-muted">
        {notice.kind === 'all'
          ? 'Ulož si ty, na kterých ti záleží. Hodnocení a komentáře zůstanou.'
          : 'Jsou to tvoje největší soubory a v aplikaci už dochází místo. Ulož si je, jestli o ně stojíš. Hodnocení a komentáře zůstanou.'}
      </p>
      <Link to="/student/feedback" className="mt-1.5 inline-block text-xs font-semibold text-coral-dark hover:underline">
        Moje nahrávky
      </Link>
    </div>
  )
}
