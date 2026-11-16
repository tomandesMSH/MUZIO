import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SubmitError, submitRecording } from './submitRecording'

const api = vi.hoisted(() => ({
  uploadRecording: vi.fn(),
  insertPracticeLog: vi.fn(),
  recordPracticeSession: vi.fn(),
}))
vi.mock('./data/practiceLogs', () => api)

const input = { userId: 'u1', blob: new Blob(['x']), durationSeconds: 60, assignmentId: 'a1' }

describe('submitRecording', () => {
  beforeEach(() => {
    api.uploadRecording.mockReset().mockResolvedValue('https://x/rec.webm')
    api.insertPracticeLog.mockReset().mockResolvedValue('log1')
    api.recordPracticeSession.mockReset().mockResolvedValue({ stars: 0, streak: 3, streakFreezesAvailable: 1 })
  })

  it('uploads, adds the row and updates the streak', async () => {
    const { session } = await submitRecording(input)
    expect(api.insertPracticeLog).toHaveBeenCalledWith('u1', 'https://x/rec.webm', 'a1', 60, undefined)
    expect(session?.streak).toBe(3)
  })

  it('a failed upload: nothing to keep but the take', async () => {
    api.uploadRecording.mockRejectedValue(new Error('offline'))
    const err = await submitRecording(input).catch((e) => e)
    expect(err).toBeInstanceOf(SubmitError)
    expect(err.message).toBe('offline')
    expect(err.audioUrl).toBeUndefined()
  })

  it('a failed row after the upload remembers the uploaded sound', async () => {
    api.insertPracticeLog.mockRejectedValue({ message: 'timeout' })
    const err = await submitRecording(input).catch((e) => e)
    expect(err.audioUrl).toBe('https://x/rec.webm')
    expect(err.message).toBe('timeout')
  })

  it('a retry with the uploaded sound does not upload again', async () => {
    await submitRecording({ ...input, note: 'ahoj', audioUrl: 'https://x/earlier.webm' })
    expect(api.uploadRecording).not.toHaveBeenCalled()
    expect(api.insertPracticeLog).toHaveBeenCalledWith('u1', 'https://x/earlier.webm', 'a1', 60, 'ahoj')
  })

  it('a failed streak update still counts as sent (no duplicate on retry)', async () => {
    api.recordPracticeSession.mockRejectedValue(new Error('rpc'))
    expect(await submitRecording(input)).toEqual({ session: null })
  })
})
