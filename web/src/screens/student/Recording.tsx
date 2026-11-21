import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RecordingUI } from '../../components/audio/RecordingUI'
import { Metronome } from '../../components/practice/Metronome'
import { Tuner } from '../../components/practice/Tuner'
import { Collapse, Chevron } from '../../components/ui/Collapse'
import { AudioFilePicker } from '../../components/audio/AudioFilePicker'
import { Toast } from '../../components/ui/Toast'
import { Confetti } from '../../components/gamification/Confetti'
import { SentOverlay } from '../../components/audio/SentOverlay'
import { playSent } from '../../lib/sounds'
import { AttachmentLink } from '../../components/lessons/AttachmentLink'
import { useAuth } from '../../lib/AuthProvider'
import { fetchOwnLogsCount, fetchWeeklyStats } from '../../lib/data/practiceLogs'
import { SubmitError, submitRecording } from '../../lib/submitRecording'
import type { PracticeSessionResult } from '../../lib/data/practiceLogs'
import { deletePendingUpload, savePendingUpload } from '../../lib/pendingUploads'
import { isPerfectWeek } from '../../lib/game-logic'
import { detectNewUnlocks } from '../../lib/gamification/detectNewUnlocks'
import { useToast } from '../../lib/useToast'
import { getErrorMessage } from '../../lib/errors'

interface LocationState {
  lessonTitle?: string
  instructions?: string
  assignmentId?: string
  attachmentPath?: string
  attachmentName?: string
  // An own piece instead of an assignment (migration 0039), and its link.
  ownPieceId?: string
  pieceLink?: string
}

export function Recording() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lessonTitle, instructions, assignmentId, attachmentPath, attachmentName, ownPieceId, pieceLink } = (location.state ??
    {}) as LocationState
  const { profile, refreshProfile } = useAuth()
  const { message, show } = useToast()
  const [uploading, setUploading] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  // The recording went through: "Nahrávka už letí k učiteli" until the dashboard.
  const [sent, setSent] = useState(false)
  const [metronomeOpen, setMetronomeOpen] = useState(false)
  const [tunerOpen, setTunerOpen] = useState(false)
  // A take that failed to send is kept under one id, however many retries.
  const pendingIds = useRef(new WeakMap<Blob, string>())
  // The sound already uploaded by a failed attempt: not uploaded again.
  const failedUploads = useRef(new WeakMap<Blob, string>())

  // Set at once (state would only change on the next render): two quick taps
  // on Odeslat must not send the take twice.
  const sendingRef = useRef(false)

  // After a successful send: new level or badge -> confetti. Only a bonus -
  // if any of this fails, the recording still went through.
  async function celebrate(session: PracticeSessionResult | null) {
    if (!profile) return
    try {
      const today = new Date()
      const [logsCount, weekly] = await Promise.all([
        fetchOwnLogsCount(profile.id),
        fetchWeeklyStats(profile.id, today),
      ])
      const result = detectNewUnlocks(profile.id, profile.xp ?? 0, {
        stars: session?.stars ?? profile.stars,
        streak: session?.streak ?? profile.streak,
        totalRecordings: logsCount,
        perfectWeek: isPerfectWeek(weekly.dateKeys, today),
        daysPlayedThisWeek: weekly.dateKeys.length,
        weeklyCount: weekly.weeklyCount,
      })
      if (result.newLevel || result.newBadgeIds.length > 0) {
        setCelebrating(true)
        setTimeout(() => setCelebrating(false), 2500)
      }
    } catch {
      // No celebration this time.
    }
  }

  async function handleRecorded(
    blob: Blob,
    durationSeconds: number | null,
    format?: { extension: string; contentType: string },
    note?: string,
  ): Promise<boolean> {
    if (!profile || sendingRef.current) return false
    sendingRef.current = true
    setUploading(true)
    const pendingId = pendingIds.current.get(blob)
    let session: PracticeSessionResult | null
    try {
      ;({ session } = await submitRecording({
        userId: profile.id,
        blob,
        durationSeconds,
        format,
        assignmentId,
        ownPieceId,
        note,
        audioUrl: failedUploads.current.get(blob),
      }))
    } catch (err) {
      // Keep the take in the phone, so it's not lost if the page is closed.
      const audioUrl = err instanceof SubmitError ? err.audioUrl : undefined
      if (audioUrl) failedUploads.current.set(blob, audioUrl)
      const id = pendingId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const kept = await savePendingUpload({
        id,
        userId: profile.id,
        blob,
        durationSeconds,
        format,
        assignmentId,
        ownPieceId,
        lessonTitle,
        note,
        audioUrl,
      })
      if (kept) pendingIds.current.set(blob, id)
      show(
        kept
          ? 'Nahrávka se neodeslala, ale je uložená v telefonu. Zkus to znovu, nebo ji pošli později z Dashboardu.'
          : getErrorMessage(err, 'Nahrání se nepovedlo, zkus to znovu.'),
      )
      sendingRef.current = false
      setUploading(false)
      return false
    }

    // Sent. Nothing from here on may turn it into "neodeslala".
    if (pendingId) await deletePendingUpload(pendingId)
    setSent(true)
    playSent()
    refreshProfile()
    void celebrate(session)
    setTimeout(() => navigate('/student'), 2200)
    return true
  }

  return (
    <div className="max-w-md md:max-w-lg mx-auto p-5">
      <Confetti active={celebrating} />
      <SentOverlay show={sent} />
      {message && <Toast message={message} />}
      <button className="text-sm text-text-muted mb-2.5" onClick={() => navigate(-1)}>
        ← Zpět
      </button>
      <h1 className="text-xl mb-1.5">{lessonTitle ?? 'Nahrávání'}</h1>
      {instructions && <p className="text-text-muted text-xs leading-relaxed mb-2">{instructions}</p>}
      {pieceLink && (
        <a
          href={pieceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-heading font-semibold hover:bg-bg-card-alt"
        >
          Otevřít odkaz ke skladbě
        </a>
      )}
      {attachmentPath && (
        <div className="mb-3">
          <AttachmentLink assignment={{ attachment_path: attachmentPath, attachment_name: attachmentName ?? null }} />
        </div>
      )}
      <div className="mb-1">
        <button
          type="button"
          aria-expanded={metronomeOpen}
          onClick={() => setMetronomeOpen(!metronomeOpen)}
          className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-heading font-semibold"
        >
          <span>Metronom</span>
          <Chevron open={metronomeOpen} />
        </button>
        <Collapse open={metronomeOpen}>
          <div className="pb-2 space-y-1.5">
            <Metronome />
            <p className="text-[11px] text-text-muted px-1">
              Tip: cvič s ním se sluchátky. Když hraje z reproduktoru a nahráváš, mikrofon ho nahraje taky.
            </p>
          </div>
        </Collapse>
      </div>
      <div className="mb-1">
        <button
          type="button"
          aria-expanded={tunerOpen}
          onClick={() => setTunerOpen(!tunerOpen)}
          className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-heading font-semibold"
        >
          <span>Ladička</span>
          <Chevron open={tunerOpen} />
        </button>
        <Collapse open={tunerOpen}>
          {/* Closed = unmounted, so the microphone is free again. */}
          <div className="pb-2">{tunerOpen && <Tuner />}</div>
        </Collapse>
      </div>
      <RecordingUI
        sending={uploading}
        onSend={(blob, seconds, note) => handleRecorded(blob, seconds, undefined, note)}
        onReviewingChange={setReviewing}
      />
      {!reviewing && (
        <AudioFilePicker
          disabled={uploading}
          onSend={({ file, extension, contentType, durationSeconds, note }) =>
            void handleRecorded(file, durationSeconds, { extension, contentType }, note)
          }
        />
      )}
      {uploading && !reviewing && <p className="text-center text-text-muted text-sm">Nahrávám…</p>}
    </div>
  )
}
