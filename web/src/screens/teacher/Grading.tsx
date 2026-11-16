import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { RecordingAudio } from '../../components/audio/RecordingAudio'
import { Button } from '../../components/ui/Button'
import { Toast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { AppShell } from '../../components/layout/AppShell'
import { AssignToStudentModal } from '../../components/classrooms/AssignToStudentModal'
import { useQuery } from '../../lib/data/useQuery'
import { deletePracticeLog, fetchPendingReview, fetchStudentLogs, submitGrading } from '../../lib/data/practiceLogs'
import { fetchStudents } from '../../lib/data/profiles'
import { useToast } from '../../lib/useToast'
import { useAuth } from '../../lib/AuthProvider'
import { getErrorMessage } from '../../lib/errors'
import type { PracticeLog } from '../../lib/data/types'
import { xpForLog, xpMinutes } from '../../lib/game-logic'
import { RatingNotes } from '../../components/gamification/RatingNotes'
import { fetchAwardsForLog, setLogAwards } from '../../lib/data/badges'
import { FeedbackImagesEditor, type FeedbackImageItem } from '../../components/feedback/FeedbackImagesEditor'
import { fetchFeedbackImageUrls, removeFeedbackImages, uploadFeedbackImage } from '../../lib/data/feedbackImages'
import { BADGES, type TeacherBadgeId } from '../../lib/game-logic'
import type { AwardedBadge } from '../../lib/data/types'
import { pickNextToGrade } from '../../lib/grading'
import { refreshNavBadges } from '../../lib/navBadges'

// The badges a teacher gives by hand, with the reason shown on the toggle.
const TEACHER_BADGE_HINTS: Record<TeacherBadgeId, string> = {
  'maly-virtuoz': 'bez chyb',
  virtuoz: 'splněná výzva',
}
const TEACHER_BADGES = BADGES.filter((b) => b.byTeacher).map((b) => ({
  id: b.id as TeacherBadgeId,
  icon: b.icon,
  label: b.label,
  hint: TEACHER_BADGE_HINTS[b.id as TeacherBadgeId],
}))

interface LocationState {
  studentId?: string
}

export function Grading() {
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState
  const { profile } = useAuth()

  const students = useQuery(() => fetchStudents(), [])
  const logs = useQuery(
    () => (state.studentId ? fetchStudentLogs(state.studentId) : fetchPendingReview()),
    [state.studentId],
  )

  const [selectedLog, setSelectedLog] = useState<PracticeLog>()
  const [rating, setRating] = useState(0)
  const [feedbackGood, setFeedbackGood] = useState('')
  const [feedbackImprove, setFeedbackImprove] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [awards, setAwards] = useState<AwardedBadge[]>([])
  const [wantedBadges, setWantedBadges] = useState<Set<TeacherBadgeId>>(new Set())
  const [imageItems, setImageItems] = useState<FeedbackImageItem[]>([])
  // Recordings still waiting, besides the open one (for "zbývá" and Přeskočit).
  const [waiting, setWaiting] = useState<PracticeLog[]>([])
  const { message, show } = useToast()

  function nameFor(userId: string): string {
    return students.data?.find((s) => s.id === userId)?.full_name ?? 'Žák'
  }

  function selectLog(log: PracticeLog) {
    setSelectedLog(log)
    // Fresh list of what's waiting, for "Přeskočit" and the count.
    fetchPendingReview()
      .then((all) => setWaiting(all.filter((l) => l.id !== log.id)))
      .catch(() => setWaiting([]))
    setRating(log.rating ?? 0)
    setFeedbackGood(log.feedback_good ?? '')
    setFeedbackImprove(log.feedback_improve ?? '')
    setAwards([])
    setWantedBadges(new Set())
    const savedPaths = log.feedback_images ?? []
    setImageItems(savedPaths.map((path) => ({ kind: 'saved', path })))
    if (savedPaths.length > 0) {
      fetchFeedbackImageUrls(savedPaths)
        .then((urls) =>
          setImageItems((items) =>
            items.map((item) => (item.kind === 'saved' ? { ...item, url: urls.get(item.path) } : item)),
          ),
        )
        .catch(() => {
          // Thumbnails missing; the pictures themselves stay attached.
        })
    }
    fetchAwardsForLog(log.id)
      .then((current) => {
        setAwards(current)
        setWantedBadges(new Set(current.map((a) => a.badge_id)))
      })
      .catch(() => {
        // Without migration 0025 (or offline) grading still works, just without badges.
      })
  }

  function toggleBadge(id: TeacherBadgeId) {
    setWantedBadges((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDelete() {
    if (!selectedLog) return
    setDeleteConfirmOpen(false)
    setDeleting(true)
    try {
      await deletePracticeLog(selectedLog)
      show('Nahrávka byla smazána')
      setSelectedLog(undefined)
      logs.refetch()
    } catch (err) {
      show(getErrorMessage(err, 'Smazání se nepovedlo, zkus to znovu.'))
      setDeleting(false)
    }
  }

  async function handleSubmit() {
    if (!selectedLog || !profile) return
    setSubmitting(true)
    const uploaded: string[] = []
    try {
      // New pictures first, so the grade only ever points at files that exist.
      const finalPaths: string[] = []
      for (const item of imageItems) {
        if (item.kind === 'saved') finalPaths.push(item.path)
        else {
          const path = await uploadFeedbackImage(selectedLog.id, item.image)
          uploaded.push(path)
          finalPaths.push(path)
        }
      }
      const savedBefore = selectedLog.feedback_images ?? []
      const imagesChanged = savedBefore.join('|') !== finalPaths.join('|')
      await submitGrading(
        selectedLog.id,
        {
          rating,
          feedback_good: feedbackGood,
          feedback_improve: feedbackImprove,
          ...(imagesChanged ? { feedback_images: finalPaths.length > 0 ? finalPaths : null } : {}),
        },
        profile.id,
      )
      uploaded.length = 0
      await removeFeedbackImages(savedBefore.filter((path) => !finalPaths.includes(path)))
      await setLogAwards(selectedLog, awards, wantedBadges)
      refreshNavBadges()
      logs.refetch()
      // A new grade goes straight on to the next waiting recording; changing
      // an older grade goes back to the list.
      const wasWaiting = !selectedLog.teacher_comment
      const next = wasWaiting ? pickNextToGrade(await fetchPendingReview().catch(() => []), selectedLog) : undefined
      if (next) {
        show(`Odesláno ✓ Další nahrávka: ${nameFor(next.user_id)}`)
        selectLog(next)
      } else {
        show(wasWaiting ? 'Vše ohodnoceno 🎉' : 'Hodnocení odesláno žákovi')
        setSelectedLog(undefined)
      }
    } catch (err) {
      // Pictures uploaded for a grade that didn't save would just lie around.
      await removeFeedbackImages(uploaded)
      show(getErrorMessage(err, 'Odeslání se nepovedlo, zkus to znovu.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (selectedLog) {
    return (
      <div className="max-w-md md:max-w-lg mx-auto p-5 space-y-4">
        {message && <Toast message={message} />}
        <ConfirmDialog
          open={deleteConfirmOpen}
          title="Smazat nahrávku?"
          message="Nahrávka a s ní spojené hodnocení se nenávratně smažou."
          confirmLabel="Smazat"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button className="text-sm text-text-muted" onClick={() => setSelectedLog(undefined)}>
              ← Zpět na seznam
            </button>
            {!selectedLog.teacher_comment && waiting.length > 0 && (
              <button
                className="text-sm text-text-muted underline underline-offset-2 hover:text-text-primary"
                onClick={() => {
                  const next = pickNextToGrade(waiting, selectedLog)
                  if (next) selectLog(next)
                }}
              >
                Přeskočit →
              </button>
            )}
          </div>
          <Button
            variant="destructive"
            className="!px-3 !py-1.5 text-xs shrink-0"
            disabled={deleting}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Smazat nahrávku
          </Button>
        </div>
        <div>
          <h1 className="text-xl">Hodnocení nahrávky</h1>
          <p className="text-text-muted text-sm">
            {nameFor(selectedLog.user_id)} · {new Date(selectedLog.created_at).toLocaleString('cs-CZ')}
            {!selectedLog.teacher_comment && ` · ke kontrole zbývá ${waiting.length + 1}`}
          </p>
        </div>
        <RecordingAudio src={selectedLog.audio_url} />
        <div>
          <label className="text-sm font-heading font-semibold mb-1.5 flex items-center gap-1.5">
            <span aria-hidden>✅</span> Co se povedlo
          </label>
          <textarea
            className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
            value={feedbackGood}
            onChange={(e) => setFeedbackGood(e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <label className="text-sm font-heading font-semibold mb-1.5 flex items-center gap-1.5">
            <span aria-hidden>🎯</span> Co zlepšit
          </label>
          <textarea
            className="w-full rounded-xl bg-bg-card-alt shadow-clay-press px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-coral"
            value={feedbackImprove}
            onChange={(e) => setFeedbackImprove(e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <div className="text-sm font-heading font-semibold mb-1.5 flex items-center gap-1.5">
            <span aria-hidden>🎵</span> Hodnocení
          </div>
          <RatingNotes rating={rating} onChange={setRating} />
          <p className="text-xs text-text-muted mt-1.5">
            {rating > 0
              ? `Za tuhle nahrávku: ${xpMinutes(selectedLog.duration_seconds)} min × ${rating} = ${xpForLog(rating, selectedLog.duration_seconds)} XP`
              : 'Vyber 1–5 not. XP žák dostane až po ohodnocení.'}
            {selectedLog.duration_seconds == null && rating > 0 ? ' (délka neznámá, počítá se 1 min)' : ''}
          </p>
        </div>
        <FeedbackImagesEditor items={imageItems} onChange={setImageItems} />
        <div>
          <div className="text-sm font-heading font-semibold mb-1.5 flex items-center gap-1.5">
            <span aria-hidden>🏅</span> Odznak za tuhle nahrávku
          </div>
          <div className="flex flex-wrap gap-2">
            {TEACHER_BADGES.map((badge) => {
              const on = wantedBadges.has(badge.id)
              return (
                <button
                  key={badge.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleBadge(badge.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-heading font-semibold transition ${
                    on ? 'bg-coral-tint text-coral-dark shadow-clay-sm' : 'bg-bg-card-alt text-text-muted shadow-clay-press'
                  }`}
                >
                  {badge.icon} {badge.label} <span className="font-body font-normal">· {badge.hint}</span>
                </button>
              )
            })}
          </div>
        </div>
        <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
          Odeslat hodnocení
        </Button>
      </div>
    )
  }

  return (
    <AppShell role="teacher">
      {message && <Toast message={message} />}
      <div className="space-y-4 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl">
            {state.studentId ? `Nahrávky - ${nameFor(state.studentId)}` : 'Ke kontrole'}
          </h1>
          {state.studentId && (
            <Button className="!px-3 !py-1.5 text-xs shrink-0" onClick={() => setAssignOpen(true)}>
              Zadat úkol pro {nameFor(state.studentId)}
            </Button>
          )}
        </div>
        {logs.loading && <p className="text-text-muted text-sm">Načítám…</p>}
        {logs.data?.length === 0 && <p className="text-text-muted text-sm">Žádné nahrávky ke zobrazení.</p>}
        <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
          {logs.data?.map((log) => (
            <button
              key={log.id}
              className="w-full text-left rounded-2xl bg-bg-card shadow-clay-sm p-3.5"
              onClick={() => selectLog(log)}
            >
              <div className="font-heading font-semibold text-sm">{nameFor(log.user_id)}</div>
              <div className="text-text-muted text-xs">
                {new Date(log.created_at).toLocaleString('cs-CZ')}
                {log.teacher_comment ? ' · ohodnoceno' : ' · čeká na hodnocení'}
              </div>
            </button>
          ))}
        </div>
      </div>
      {state.studentId && (
        <AssignToStudentModal
          open={assignOpen}
          studentId={state.studentId}
          studentName={nameFor(state.studentId)}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => show('Úkol byl zadán')}
        />
      )}
    </AppShell>
  )
}
