import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteAssignment, updateAssignment } from './classrooms'

const calls = vi.hoisted(() => ({ updates: [] as unknown[], removed: [] as string[][], uploaded: [] as string[] }))

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      delete: () => ({ eq: async () => ({ error: null }) }),
      update: (row: unknown) => {
        calls.updates.push(row)
        return { eq: async () => ({ error: null }) }
      },
    }),
    storage: {
      from: () => ({
        upload: async (path: string) => {
          calls.uploaded.push(path)
          return { error: null }
        },
        remove: async (paths: string[]) => {
          calls.removed.push(paths)
          return { error: null }
        },
      }),
    },
  },
}))
vi.mock('../push', () => ({ notifyPush: vi.fn() }))

const assignment = {
  id: 'a1',
  classroom_id: 'c1',
  teacher_id: 't1',
  title: 'Stupnice',
  description: null,
  created_at: '',
  attachment_path: 'a1/stara.mid',
  attachment_name: 'stara.mid',
}

describe('updateAssignment', () => {
  beforeEach(() => {
    calls.updates = []
    calls.removed = []
    calls.uploaded = []
  })

  it('saves the text and the deadline, keeps the file', async () => {
    await updateAssignment(assignment, { title: ' Stupnice C ', description: '  ', dueDate: '', attachment: { kind: 'keep' } })
    expect(calls.updates).toEqual([{ title: 'Stupnice C', description: null, due_date: null }])
    expect(calls.removed).toEqual([])
  })

  it('removes the file', async () => {
    await updateAssignment(assignment, { title: 'X', description: '', dueDate: '2026-11-20', attachment: { kind: 'remove' } })
    expect(calls.updates[1]).toEqual({ attachment_path: null, attachment_name: null })
    expect(calls.removed).toEqual([['a1/stara.mid']])
  })

  it('replaces the file and drops the old one', async () => {
    const file = new File(['x'], 'Nova.mid')
    await updateAssignment(assignment, { title: 'X', description: '', dueDate: '', attachment: { kind: 'replace', file } })
    expect(calls.uploaded).toHaveLength(1)
    expect(calls.updates[1]).toMatchObject({ attachment_name: 'Nova.mid' })
    expect(calls.removed).toEqual([['a1/stara.mid']])
  })

  it('a new file with the same name: the old one goes first (no overwrite in storage)', async () => {
    const same = { ...assignment, attachment_path: 'a1/nova.mid', attachment_name: 'nova.mid' }
    await updateAssignment(same, { title: 'X', description: '', dueDate: '', attachment: { kind: 'replace', file: new File(['x'], 'nova.mid') } })
    expect(calls.removed).toEqual([['a1/nova.mid']])
    expect(calls.uploaded).toEqual(['a1/nova.mid'])
  })

  it('deleting removes the score too', async () => {
    await deleteAssignment(assignment)
    expect(calls.removed).toEqual([['a1/stara.mid']])
  })
})
