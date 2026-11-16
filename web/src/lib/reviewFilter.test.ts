import { describe, expect, it } from 'vitest'
import { NO_ASSIGNMENT, assignmentsWaiting, filterReview } from './reviewFilter'

const logs = [
  { id: 1, user_id: 'pavel', created_at: '2026-11-10', assignment_id: 'a1' },
  { id: 2, user_id: 'jana', created_at: '2026-11-12', assignment_id: null },
  { id: 3, user_id: 'eva', created_at: '2026-11-11', assignment_id: 'a1' },
  { id: 4, user_id: 'pavel', created_at: '2026-11-13', assignment_id: 'a2' },
]
const membersOf = new Map([
  ['3A', new Set(['pavel', 'jana'])],
  ['4B', new Set(['eva'])],
])

describe('review filter', () => {
  it('oldest or newest first', () => {
    expect(filterReview(logs, { sort: 'oldest' }, membersOf).map((l) => l.id)).toEqual([1, 3, 2, 4])
    expect(filterReview(logs, { sort: 'newest' }, membersOf).map((l) => l.id)).toEqual([4, 2, 3, 1])
  })

  it('by class and by assignment', () => {
    expect(filterReview(logs, { sort: 'oldest', classroomId: '3A' }, membersOf).map((l) => l.id)).toEqual([1, 2, 4])
    expect(filterReview(logs, { sort: 'oldest', assignmentId: 'a1' }, membersOf).map((l) => l.id)).toEqual([1, 3])
    expect(filterReview(logs, { sort: 'oldest', assignmentId: NO_ASSIGNMENT }, membersOf).map((l) => l.id)).toEqual([2])
    expect(filterReview(logs, { sort: 'oldest', classroomId: '4B', assignmentId: 'a2' }, membersOf)).toEqual([])
  })

  it('counts what waits per assignment', () => {
    expect([...assignmentsWaiting(logs)]).toEqual([
      ['a1', 2],
      [NO_ASSIGNMENT, 1],
      ['a2', 1],
    ])
  })
})
