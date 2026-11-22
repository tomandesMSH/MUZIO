import { beforeEach, describe, expect, it, vi } from 'vitest'

let isModerator = false
const tables: Record<string, unknown[]> = {
  classrooms: [{ id: 'c1' }],
  classroom_members: [{ student_id: 'p1' }, { student_id: 'p2' }],
}
vi.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 't1' } } } }) },
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: async () => ({ data: tables[table], error: null }),
        maybeSingle: async () => ({ data: { is_moderator: isModerator }, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: tables[table], error: null }),
      }
      return chain
    },
  },
}))

const { myPupilScope, resetPupilScope } = await import('./teacherScope')

describe('myPupilScope', () => {
  beforeEach(() => resetPupilScope())

  it('a plain teacher needs no narrowing (RLS already does it)', async () => {
    isModerator = false
    expect(await myPupilScope()).toBeUndefined()
  })

  it('a teacher who is also an admin sees only the pupils of their classrooms', async () => {
    isModerator = true
    expect(await myPupilScope()).toEqual(new Set(['p1', 'p2']))
  })
})
