import { describe, expect, it } from 'vitest'
import { progressPairs } from './progressPairs'

const log = (id: string, created_at: string, assignment_id: string | null, own_piece_id: string | null = null, audio_url: string | null = `u${id}`) => ({
  id,
  created_at,
  assignment_id,
  own_piece_id,
  audio_url,
})

describe('progressPairs', () => {
  it('pairs the first and latest recording of each assignment or own piece', () => {
    const pairs = progressPairs([
      log('1', '2026-10-01', 'a1'),
      log('2', '2026-10-20', 'a1'),
      log('3', '2026-10-10', 'a1'),
      log('4', '2026-11-01', null, 'p1'),
      log('5', '2026-11-05', null, 'p1'),
    ])
    expect(pairs.map((p) => [p.key, p.first.id, p.latest.id, p.count])).toEqual([
      ['p:p1', '4', '5', 2],
      ['a:a1', '1', '2', 3],
    ])
    expect(pairs[0].ownPieceId).toBe('p1')
    expect(pairs[1].assignmentId).toBe('a1')
  })

  it('skips single recordings, free practice and archived sound', () => {
    expect(
      progressPairs([
        log('1', '2026-10-01', 'a1'),
        log('2', '2026-10-02', null),
        log('3', '2026-10-03', null),
        log('4', '2026-10-04', 'a2', null, null),
        log('5', '2026-10-05', 'a2'),
      ]),
    ).toEqual([])
  })
})
