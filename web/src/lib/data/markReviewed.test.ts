import { describe, expect, it, vi } from 'vitest'

// update().in().is().select() resolves with the rows RLS let through.
let rows: { id: number }[] = []
vi.mock('../supabase', () => {
  const chain = {
    update: () => chain,
    in: () => chain,
    is: () => chain,
    eq: () => chain,
    select: async () => ({ data: rows, error: null }),
  }
  return { supabase: { from: () => chain } }
})
vi.mock('../push', () => ({ notifyPush: vi.fn() }))

const { markReviewed, submitGrading } = await import('./practiceLogs')

describe('changes RLS skips without an error', () => {
  it('markReviewed says when nothing (or only part) was changed', async () => {
    rows = [{ id: 1 }, { id: 2 }]
    await expect(markReviewed(['1', '2'])).resolves.toBeUndefined()
    rows = []
    await expect(markReviewed(['1'])).rejects.toThrow(/nemáš oprávnění/)
    rows = [{ id: 1 }]
    await expect(markReviewed(['1', '2'])).rejects.toThrow('Označeno jen 1 z 2')
  })

  it('submitGrading fails loudly when the grade was not saved', async () => {
    rows = []
    await expect(submitGrading('1', { rating: 4, feedback_good: 'ok', feedback_improve: '' }, 't1')).rejects.toThrow(
      /Hodnocení se neuložilo/,
    )
    rows = [{ id: 1 }]
    await expect(submitGrading('1', { rating: 4, feedback_good: 'ok', feedback_improve: '' }, 't1')).resolves.toBeUndefined()
  })
})
