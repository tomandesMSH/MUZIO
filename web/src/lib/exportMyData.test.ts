import { describe, expect, it } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { buildArchive, extensionOf, profileJson, recordingDownloads, recordingRows, stamp, zipFiles, type ExportData } from './exportMyData'
import type { PracticeLog, Profile } from './data/types'

const log = (id: number, created: string, extra: Partial<PracticeLog> = {}) =>
  ({
    id,
    user_id: 's1',
    created_at: created,
    audio_url: `https://x.supabase.co/storage/v1/object/public/recordings/s1/${id}.webm`,
    duration_seconds: 42,
    rating: null,
    assignment_id: null,
    own_piece_id: null,
    feedback_good: null,
    feedback_improve: null,
    student_note: null,
    ...extra,
  }) as unknown as PracticeLog

const data: ExportData = {
  profile: { id: 's1', full_name: 'Šárka Nová', username: 'sarka', xp: 30, stars: 2, streak: 3, consent_given: true } as Profile,
  logs: [
    log(2, new Date(2026, 10, 16, 14, 30).toISOString(), { assignment_id: 'a1', rating: 4, feedback_good: 'Hezky; čistě' }),
    log(1, new Date(2026, 10, 10, 9, 5).toISOString(), { audio_url: null, own_piece_id: 'p1' }),
  ],
  titles: new Map([['a1', 'Stupnice C dur']]),
  pieces: new Map([['p1', 'Moje píseň']]),
  classrooms: ['Housle'],
  awards: [],
}

describe('export my data', () => {
  it('names files by date', () => {
    expect(stamp(new Date(2026, 10, 16, 14, 30).toISOString())).toBe('2026-11-16_14-30')
    expect(extensionOf('https://x/a/b.M4A?token=1', 'webm')).toBe('m4a')
    expect(extensionOf('https://x/a/b', 'webm')).toBe('webm')
  })

  it('a table of recordings, oldest first', () => {
    const rows = recordingRows(data)
    expect(rows[1].slice(1, 4)).toEqual(['Moje píseň', 42, null])
    expect(rows[1][7]).toBe('archivováno')
    expect(rows[2][1]).toBe('Stupnice C dur')
    expect(rows[2][7]).toBe('nahravky/2026-11-16_14-30.webm')
  })

  it('the profile', () => {
    const p = JSON.parse(profileJson(data))
    expect(p).toMatchObject({ jmeno: 'Šárka Nová', xp: 30, tridy: ['Housle'], vlastni_skladby: ['Moje píseň'], pocet_nahravek: 2 })
  })

  it('a ZIP with the files, and a list of what could not be downloaded', async () => {
    const downloads = [...recordingDownloads(data.logs), { url: 'https://signed/voice', path: 'komentare/hlas.webm' }]
    const progress: string[] = []
    const files = await buildArchive(
      data,
      downloads,
      async (url) => {
        if (url.includes('voice')) throw new Error('404')
        return new Uint8Array([1, 2, 3])
      },
      (done, total) => progress.push(`${done}/${total}`),
    )
    expect(progress).toEqual(['0/2', '1/2', '2/2'])
    const zip = unzipSync(new Uint8Array(await (await zipFiles(files)).arrayBuffer()))
    expect(Object.keys(zip).sort()).toEqual(
      ['PRECTI-ME.txt', 'chybi.txt', 'nahravky.csv', 'nahravky/2026-11-16_14-30.webm', 'profil.json'].sort(),
    )
    expect(strFromU8(zip['nahravky.csv'])).toContain('"Hezky; čistě"')
    expect(strFromU8(zip['chybi.txt'])).toContain('komentare/hlas.webm')
  })
})
