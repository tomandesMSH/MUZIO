// Recordings that didn't reach the teacher (weak school wifi, offline...),
// kept in this browser's IndexedDB until they're sent or thrown away, so a
// take is never lost. Every call is best effort: without IndexedDB (private
// mode, old browser) nothing is kept and nothing breaks.

export interface PendingUpload {
  id: string
  userId: string
  blob: Blob
  durationSeconds: number | null
  format?: { extension: string; contentType: string }
  assignmentId?: string
  lessonTitle?: string
  note?: string
  ownPieceId?: string
  // Already uploaded by the failed attempt (lib/submitRecording.ts).
  audioUrl?: string
  createdAt: string
}

const DB_NAME = 'muzio'
const STORE = 'pending-uploads'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB není k dispozici'))
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = work(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

// Keeps the recording; true when it was saved.
export async function savePendingUpload(upload: Omit<PendingUpload, 'id' | 'createdAt'> & { id?: string }): Promise<boolean> {
  const row: PendingUpload = {
    ...upload,
    id: upload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  try {
    await run('readwrite', (store) => store.put(row))
    return true
  } catch {
    return false
  }
}

// This user's waiting recordings, oldest first.
export async function listPendingUploads(userId: string): Promise<PendingUpload[]> {
  try {
    const all = await run('readonly', (store) => store.getAll() as IDBRequest<PendingUpload[]>)
    return all.filter((u) => u.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  } catch {
    return []
  }
}

export async function deletePendingUpload(id: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(id))
  } catch {
    // Nothing to do - it'll show up again and can be thrown away then.
  }
}
