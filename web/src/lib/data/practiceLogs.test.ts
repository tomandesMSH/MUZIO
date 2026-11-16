import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adjustStudentStars, insertPracticeLog } from './practiceLogs'

const db = vi.hoisted(() => ({
  insert: vi.fn((_rows: unknown) => ({
    select: () => ({ single: async () => ({ data: { id: 41 }, error: null as unknown }) }),
  })),
  rpc: vi.fn(async (_name: string, _args: unknown) => ({ data: 3 as unknown, error: null as unknown })),
}))

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({ insert: db.insert }),
    rpc: db.rpc,
  },
}))

describe('insertPracticeLog', () => {
  beforeEach(() => db.insert.mockClear())

  it('stores the length in whole seconds', async () => {
    expect(await insertPracticeLog('u1', 'https://x/a.wav', 'as1', 94.6)).toBe('41')
    expect(db.insert).toHaveBeenCalledWith([
      { user_id: 'u1', audio_url: 'https://x/a.wav', assignment_id: 'as1', duration_seconds: 95 },
    ])
  })

  it('leaves the length out when it is unknown', async () => {
    await insertPracticeLog('u1', 'https://x/a.mp3', undefined, null)
    expect(db.insert).toHaveBeenCalledWith([{ user_id: 'u1', audio_url: 'https://x/a.mp3', assignment_id: null }])
  })
})

describe('adjustStudentStars', () => {
  it('calls the teacher_adjust_stars function and returns the new count', async () => {
    expect(await adjustStudentStars('s1', 1)).toBe(3)
    expect(db.rpc).toHaveBeenCalledWith('teacher_adjust_stars', { p_student_id: 's1', p_delta: 1 })
  })

  it('passes the database error on (e.g. not this teacher’s pupil)', async () => {
    db.rpc.mockResolvedValueOnce({ data: null, error: new Error('Tomuto žákovi nemůžeš dávat hvězdy.') })
    await expect(adjustStudentStars('s1', 1)).rejects.toThrow('Tomuto žákovi nemůžeš dávat hvězdy.')
  })
})
