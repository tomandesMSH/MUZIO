import { useEffect, useRef, useState } from 'react'
import { Skeleton } from '../../components/ui/Skeleton'
import { AppShell } from '../../components/layout/AppShell'
import { RecordingAudio } from '../../components/audio/RecordingAudio'
import type { AudioPlayerHandle } from '../../components/audio/AudioPlayer'
import { TimedText } from '../../components/feedback/TimedText'
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
import { canOfferDownload, downloadRecording, DOWNLOAD_OFFER_AFTER_DAYS } from '../../lib/recordingDownload'

export function Feedback() {
  const { profile } = useAuth()
  const logs = useQuery(() => (profile ? fetchOwnLogs(profile.id) : Promise.resolve([])), [profile?.id])
  const awards = useQuery(() => (profile ? fetchAwardedBadges(profile.id) : Promise.resolve([])), [profile?.id])
  const awardsForLog = awardsByLog(awards.data ?? [])
  const [reportTarget, setReportTarget] = useState<PracticeLog>()
  const [reporting, setReporting] = useState(false)
  const [reportError, setReportError] = useState<string>()
  const { message, show } = useToast()
  const [now] = useState(() => new Date())
  const [downloading, setDownloading] = useState<string>()
  const hasOld = (logs.data ?? []).some((log) => canOfferDownload(log, now))

  async function handleDownload(log: PracticeLog) {
    setDownloading(String(log.id))
    try {
      await downloadRecording(log)
    } catch (err) {
      show(getErrorMessage(err, 'Stažení se nepovedlo, zkus to znovu.'))
    } finally {
      setDownloading(undefined)
    }
  }
  // Each recording's player, so a time in the comment ("0:42") can jump in it.
  const players = useRef(new Map<string, AudioPlayerHandle>())
  const seekIn = (logId: string) => (seconds: number) => players.current.get(logId)?.seek(seconds)
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
        {hasOld && (
          <div className="rounded-2xl bg-coral-tint text-coral-dark p-4 text-sm">
            <p className="font-heading font-semibold">Starší nahrávky si můžeš stáhnout</p>
            <p className="mt-0.5">
              Nahrávky starší než {DOWNLOAD_OFFER_AFTER_DAYS} dní jednou z aplikace smažeme, aby bylo místo pro nové.
              Ty, na kterých ti záleží, si ulož tlačítkem Stáhnout. Hodnocení a komentáře tu zůstanou.
            </p>
          </div>
        )}
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
                        <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-heading font-semibold text-white">
                          Nové
                        </span>
                      )}
                      <Badge tone="success">+{xpForLog(log.rating, log.duration_seconds)} XP</Badge>
                    </span>
                  ) : (
                    <Badge tone="pending">Čeká na hodnocení</Badge>
                  )}
                </div>

                <RecordingAudio
                  src={log.audio_url}
                  ref={(player) => {
                    if (player) players.current.set(String(log.id), player)
                    else players.current.delete(String(log.id))
                  }}
                />
                {canOfferDownload(log, now) && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-coral-dark disabled:opacity-50"
                    disabled={downloading === String(log.id)}
                    onClick={() => handleDownload(log)}
                  >
                    {downloading === String(log.id) ? 'Stahuji…' : 'Stáhnout nahrávku'}
                  </button>
                )}

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
                          {badge?.icon} {badge?.label ?? award.badge_id}
                        </div>
                      )
                    })}
                    {log.feedback_good && (
                      <div>
                        <div className="font-heading font-semibold text-xs flex items-center gap-1.5 mb-0.5">
                          Co se povedlo
                        </div>
                        <p className="text-text-muted whitespace-pre-wrap break-words">
                          <TimedText text={log.feedback_good} onSeek={log.audio_url ? seekIn(String(log.id)) : undefined} />
                        </p>
                      </div>
                    )}
                    {log.feedback_audio && (
                      <div>
                        <div className="font-heading font-semibold text-xs flex items-center gap-1.5 mb-1">
                          Komentář od učitele
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
                          Co zlepšit
                        </div>
                        <p className="text-text-muted whitespace-pre-wrap break-words">
                          <TimedText
                            text={log.feedback_improve}
                            onSeek={log.audio_url ? seekIn(String(log.id)) : undefined}
                          />
                        </p>
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
