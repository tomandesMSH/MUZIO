import { describe, expect, it, vi } from 'vitest'

const tables = vi.hoisted(() => ({
  practice_logs: { data: [{ created_at: '2026-11-20T09:00:00' }, { created_at: '2026-11-20T15:00:00' }], error: null },
  teacher_practice_days: { data: [{ day: '2026-11-18' }, { day: '2026-11-20' }], error: null } as { data: unknown; error: unknown },
}))

vi.mock('../supabase', () => ({
  supabase: {
    from: (table: keyof typeof tables) => ({
      select: () => ({ eq: async () => tables[table] }),
    }),
  },
}))

const { fetchPracticeDayKeys } = await import('./practiceLogs')

describe('fetchPracticeDayKeys', () => {
  it('joins recording days and days the teacher added, each once', async () => {
    expect((await fetchPracticeDayKeys('u1')).sort()).toEqual(['2026-11-18', '2026-11-20'])
  })

  it('without the teacher days table, just the recordings', async () => {
    tables.teacher_practice_days = { data: null, error: { message: 'relation does not exist' } }
    expect(await fetchPracticeDayKeys('u1')).toEqual(['2026-11-20'])
  })
})
