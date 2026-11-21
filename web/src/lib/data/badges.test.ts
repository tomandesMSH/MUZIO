import { beforeEach, describe, expect, it, vi } from 'vitest'
import { awardsByLog, countAwards, setLogAwards } from './badges'
import type { AwardedBadge } from './types'

const db = vi.hoisted(() => ({
  insert: vi.fn(async (_rows: unknown) => ({ error: null as unknown })),
  deleteIn: vi.fn(async (_col: string, _ids: unknown) => ({ error: null as unknown })),
}))

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({ insert: db.insert, delete: () => ({ in: db.deleteIn }) }),
  },
}))

const award = (id: string, badge_id: AwardedBadge['badge_id'], practice_log_id: string | number = 7): AwardedBadge => ({
  id,
  badge_id,
  practice_log_id,
  student_id: 's1',
  awarded_by: 't1',
  created_at: '2026-11-15T10:00:00Z',
})

describe('countAwards / awardsByLog', () => {
  it('counts each badge and groups them by recording', () => {
    const awards = [award('a', 'maly-virtuoz', 7), award('b', 'maly-virtuoz', 8), award('c', 'virtuoz', 7)]
    expect(countAwards(awards)).toMatchObject({ 'maly-virtuoz': 2, virtuoz: 1, 'lovec-not': 0 })
    expect(awardsByLog(awards).get('7')?.map((a) => a.id)).toEqual(['a', 'c'])
    expect(awardsByLog(awards).get('8')?.map((a) => a.id)).toEqual(['b'])
  })
})

describe('setLogAwards', () => {
  const log = { id: '7', user_id: 's1' }
  beforeEach(() => {
    db.insert.mockClear()
    db.deleteIn.mockClear()
  })

  it('awards only the newly ticked badges', async () => {
    await setLogAwards(log, [award('a', 'maly-virtuoz')], new Set(['maly-virtuoz', 'virtuoz'] as const))
    expect(db.insert).toHaveBeenCalledWith([{ student_id: 's1', practice_log_id: '7', badge_id: 'virtuoz' }])
    expect(db.deleteIn).not.toHaveBeenCalled()
  })

  it('takes back unticked badges', async () => {
    await setLogAwards(log, [award('a', 'maly-virtuoz'), award('c', 'virtuoz')], new Set(['virtuoz'] as const))
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.deleteIn).toHaveBeenCalledWith('id', ['a'])
  })

  it('does nothing when nothing changed', async () => {
    await setLogAwards(log, [award('a', 'virtuoz')], new Set(['virtuoz'] as const))
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.deleteIn).not.toHaveBeenCalled()
  })
})
