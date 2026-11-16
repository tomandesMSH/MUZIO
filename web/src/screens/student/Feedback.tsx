import { useEffect, useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { AppShell } from '../../components/layout/AppShell'
import { RecordingAudio } from '../../components/audio/RecordingAudio'
import { Badge } from '../../components/ui/Badge'
import { Toast } from '../../components/ui/Toast'
import { ReportModal } from '../../components/moderation/ReportModal'
import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import { fetchOwnLogs, markFeedbackSeen } from '../../lib/data/practiceLogs'
import { refreshNavBadges } from '../../lib/navBadges'
import { reportContent } from '../../lib/data/moderation'
import { useToast } from '../../lib/useToast'
import { getErrorMessage } from '../../lib/errors'
import type { PracticeLog } from '../../lib/data/types'
import { BADGES, xpForLog } from '../../lib/game-logic'
import { awardsByLog, fetchAwardedBadges } from '../../lib/data/badges'
import { FeedbackImages } from '../../components/feedback/FeedbackImages'
import { SavedVoiceComment } from '../../components/feedback/VoiceComment'
import { RatingNotes } from '../../components/gamification/RatingNotes'

export function Feedback() {
  const { profile } = useAuth()
  const logs = useQuery(() => (profile ? fetchOwnLogs(profile.id) : Promise.resolve([])), [profile?.id])
  const awards = useQuery(() => (profile ? fetchAwardedBadges(profile.id) : Promise.resolve([])), [profile?.id])
  const awardsForLog = awardsByLog(awards.data ?? [])
  const [reportTarget, setReportTarget] = useState<PracticeLog>()
  const [reporting, setReporting] = useState(false)
  const [reportError, setReportError] = useState<string>()
  const { message, show } = useToast()
  // Grades that were new when the page opened: marked "Nové" for this visit,
  // and seen from now on (the number in the menu goes away).
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    const unseen = (logs.data ?? []).filter((log) => log.rating != null && log.feedback_seen_at === null)
    if (unseen.length === 0) return
    setNewIds(new Set(unseen.map((log) => String(log.id))))
    markFeedbackSeen(unseen.map((log) => log.id))
      .then(refreshNavBadges)
      .catch(() => {
        // Stays new; marked next time.
      })
  }, [logs.data])

  async function handleReport(reason: string, description: string) {
    if (!profile || !reportTarget) return
    setReporting(true)
    setReportError(undefined)
    try {
      await reportContent({
        reporterId: profile.id,
        reportedUserId: reportTarget.graded_by ?? undefined,
        practiceLogId: reportTarget.id,
        reason,
        description,
      })
      setReportTarget(undefined)
      show('Nahlášeno - podívá se na to moderátor.')
    } catch (err) {
      setReportError(getErrorMessage(err, 'Nahlášení se nepovedlo, zkus to znovu.'))
    } finally {
      setReporting(false)
    }
  }

  return (
    <AppShell role="student">
      {message && <Toast message={message} />}
      <div className="space-y-4 flex-1">
        <h1 className="text-xl">Nahrávky</h1>
        {logs.loading && !logs.data && <Skeleton rows={2} height="h-40" />}
        {logs.error && (
          <p className="text-sm text-coral-dark">Načtení nahrávek se nepovedlo: {logs.error.message}</p>
        )}
        {logs.data?.length === 0 && (
          <p className="text-text-muted text-sm">Ještě jsi nic nenahrál/a - zkus to na Dashboardu.</p>
        )}

        <div className="space-y-3">
          {logs.data?.map((log) => {
            const graded = log.rating != null
            return (
              <div key={log.id} className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    {new Date(log.created_at).toLocaleString('cs-CZ')}
                  </span>
                  {graded ? (
                    <span className="flex items-center gap-1.5">
                      {newIds.has(String(log.id)) && (
                        <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-heading font-bold uppercase tracking-wide text-white">
                          Nové
                        </span>
                      )}
                      <Badge tone="success">+{xpForLog(log.rating, log.duration_seconds)} XP</Badge>
                    </span>
                  ) : (
                    <Badge tone="pending">Čeká na hodnocení</Badge>
                  )}
                </div>

                <RecordingAudio src={log.audio_url} />

                {graded && (
                  <div className="space-y-2 text-sm">
                    <RatingNotes rating={log.rating ?? 0} />
                    {(awardsForLog.get(String(log.id)) ?? []).map((award) => {
                      const badge = BADGES.find((b) => b.id === award.badge_id)
                      return (
                        <div
                          key={award.id}
                          className="inline-flex items-center gap-1.5 mr-2 rounded-full bg-coral-tint text-coral-dark px-3 py-1 text-xs font-heading font-semibold"
                        >
                          🏅 {badge?.icon} {badge?.label ?? award.badge_id}
                        </div>
                      )
                    })}
                    {log.feedback_good && (
                      <div>
                        <div className="font-heading font-semibold text-xs flex items-center gap-1.5 mb-0.5">
                          <span aria-hidden>✅</span> Co se povedlo
                        </div>
                        <p className="text-text-muted">{log.feedback_good}</p>
                      </div>
                    )}
                    {log.feedback_audio && (
                      <div>
                        <div className="font-heading font-semibold text-xs flex items-center gap-1.5 mb-1">
                          <span aria-hidden>🎙</span> Komentář od učitele
                        </div>
                        <SavedVoiceComment path={log.feedback_audio} />
                      </div>
                    )}
                    {log.feedback_images && log.feedback_images.length > 0 && (
                      <FeedbackImages paths={log.feedback_images} />
                    )}
                    {log.feedback_improve && (
                      <div>
                        <div className="font-heading font-semibold text-xs flex items-center gap-1.5 mb-0.5">
                          <span aria-hidden>🎯</span> Co zlepšit
                        </div>
                        <p className="text-text-muted">{log.feedback_improve}</p>
                      </div>
                    )}
                    <button
                      className="text-xs text-coral-dark"
                      onClick={() => setReportTarget(log)}
                    >
                      Nahlásit
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ReportModal
        open={!!reportTarget}
        submitting={reporting}
        error={reportError}
        onClose={() => setReportTarget(undefined)}
        onSubmit={handleReport}
      />
    </AppShell>
  )
}
