// Sending a recording to the teacher: upload the sound, add the practice_logs
// row, update the streak. Used by the recording screen and by "Odeslat znovu"
// for a recording that didn't go through (lib/pendingUploads.ts).
import { insertPracticeLog, recordPracticeSession, uploadRecording } from './data/practiceLogs'
import type { PracticeSessionResult } from './data/practiceLogs'

export interface RecordingToSend {
  userId: string
  blob: Blob
  durationSeconds: number | null
  format?: { extension: string; contentType: string }
  assignmentId?: string
  // The pupil's note for the teacher (optional).
  note?: string
  // The pupil's own piece (instead of an assignment).
  ownPieceId?: string
  // Set when an earlier attempt already uploaded the sound: not uploaded twice.
  audioUrl?: string
}

// Failed before the recording reached the teacher. `audioUrl` is set when the
// sound was uploaded and only adding the row failed - keep it for the retry.
export class SubmitError extends Error {
  readonly audioUrl?: string
  constructor(cause: unknown, audioUrl?: string) {
    super(cause instanceof Error ? cause.message : String((cause as { message?: unknown })?.message ?? cause), { cause })
    this.name = 'SubmitError'
    this.audioUrl = audioUrl
  }
}

// The session result is null when the recording went through but the streak
// update failed - the recording counts, the streak catches up next time.
export async function submitRecording(input: RecordingToSend): Promise<{ session: PracticeSessionResult | null }> {
  let audioUrl = input.audioUrl
  try {
    if (!audioUrl) audioUrl = await uploadRecording(input.userId, input.blob, input.format)
    await insertPracticeLog(input.userId, audioUrl, input.assignmentId, input.durationSeconds, input.note, input.ownPieceId)
  } catch (err) {
    throw new SubmitError(err, audioUrl)
  }
  try {
    return { session: await recordPracticeSession(input.userId) }
  } catch {
    return { session: null }
  }
}
