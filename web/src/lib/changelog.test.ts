import { afterEach, describe, expect, it } from 'vitest'
import { CHANGELOG, changelogDate, entriesFor, markSeen, unseenEntry } from './changelog'

describe('changelog', () => {
  afterEach(() => localStorage.clear())

  it('ids are unique and each entry says something', () => {
    expect(new Set(CHANGELOG.map((e) => e.id)).size).toBe(CHANGELOG.length)
    for (const e of CHANGELOG) expect(e.items.length).toBeGreaterThan(0)
  })

  it('shows the newest entry for the role once', () => {
    const newest = entriesFor('student')[0]
    expect(unseenEntry('student')?.id).toBe(newest.id)
    markSeen(newest.id)
    expect(unseenEntry('student')).toBeUndefined()
  })

  it('keeps pupil and teacher notes apart', () => {
    expect(entriesFor('student').every((e) => e.role !== 'teacher')).toBe(true)
    expect(entriesFor('teacher').every((e) => e.role !== 'student')).toBe(true)
  })

  it('writes the date the Czech way', () => {
    expect(changelogDate('2026-11-21')).toBe('21. 11. 2026')
  })
})
