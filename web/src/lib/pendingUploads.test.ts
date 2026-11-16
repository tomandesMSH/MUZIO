import { describe, expect, it } from 'vitest'
import { deletePendingUpload, listPendingUploads, savePendingUpload } from './pendingUploads'

// jsdom has no IndexedDB - the same as a browser that refuses it (private
// mode): nothing is kept, nothing throws.
describe('pendingUploads without IndexedDB', () => {
  it('fails softly', async () => {
    expect(await savePendingUpload({ userId: 'u1', blob: new Blob(['x']), durationSeconds: 1 })).toBe(false)
    expect(await listPendingUploads('u1')).toEqual([])
    await expect(deletePendingUpload('x')).resolves.toBeUndefined()
  })
})
