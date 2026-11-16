// "Stáhnout moje data" (GDPR): everything Muzio keeps about the pupil in one
// ZIP - the recordings with the teacher's comments as a table, the profile,
// the recordings' sound, the teacher's voice comments and pictures.
// The archive is put together here (tested with a fake download); the ZIP
// library is loaded only when someone downloads.
import { toCsv, type Cell } from './csv'
import type { AwardedBadge, PracticeLog, Profile } from './data/types'

export interface ExportData {
  profile: Profile
  logs: PracticeLog[]
  titles: Map<string, string> // assignment id -> title
  pieces: Map<string, string> // own piece id -> title
  classrooms: string[]
  awards: AwardedBadge[]
}

// A file to put in the archive: where from, and where in the ZIP.
export interface Download {
  url: string
  path: string
}

const pad = (n: number) => String(n).padStart(2, '0')

// "2026-11-16_14-30" in local time - sorts by date in a file list.
export function stamp(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`
}

export function extensionOf(url: string, fallback: string): string {
  const match = /\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(new URL(url, 'https://x').pathname)
  return match ? match[1].toLowerCase() : fallback
}

function what(log: PracticeLog, data: ExportData): string {
  if (log.assignment_id) return data.titles.get(log.assignment_id) ?? 'úkol'
  if (log.own_piece_id) return data.pieces.get(log.own_piece_id) ?? 'vlastní skladba'
  return 'volné cvičení'
}

export function recordingRows(data: ExportData): Cell[][] {
  const rows: Cell[][] = [
    ['Datum', 'Úkol / skladba', 'Délka (s)', 'Noty (1–5)', 'Co se povedlo', 'Co zlepšit', 'Můj vzkaz učiteli', 'Soubor'],
  ]
  for (const log of [...data.logs].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    rows.push([
      new Date(log.created_at).toLocaleString('cs-CZ'),
      what(log, data),
      log.duration_seconds ?? null,
      log.rating ?? null,
      log.feedback_good,
      log.feedback_improve,
      log.student_note,
      log.audio_url ? `nahravky/${stamp(log.created_at)}.${extensionOf(log.audio_url, 'webm')}` : 'archivováno',
    ])
  }
  return rows
}

export function profileJson(data: ExportData): string {
  const p = data.profile
  return JSON.stringify(
    {
      jmeno: p.full_name,
      uzivatelske_jmeno: p.username,
      xp: p.xp ?? 0,
      hvezdy: p.stars,
      serie_dni: p.streak,
      tridy: data.classrooms,
      odznaky_od_ucitele: data.awards.map((a) => ({ odznak: a.badge_id, kdy: a.created_at })),
      vlastni_skladby: [...data.pieces.values()],
      sdileni_samostatneho_cviceni: !!p.share_basic_progress,
      souhlas: { udelen: !!p.consent_given, zakonny_zastupce: p.consent_guardian_name ?? null, kdy: p.consent_given_at ?? null },
      pocet_nahravek: data.logs.length,
      exportovano: new Date().toISOString(),
    },
    null,
    2,
  )
}

// The recordings' sound (public URLs) - comments come with signed URLs later.
export function recordingDownloads(logs: PracticeLog[]): Download[] {
  return logs.flatMap((log) =>
    log.audio_url
      ? [{ url: log.audio_url, path: `nahravky/${stamp(log.created_at)}.${extensionOf(log.audio_url, 'webm')}` }]
      : [],
  )
}

const encoder = new TextEncoder()

// The files of the archive: text first, then every download (one at a time,
// so a phone isn't flooded). A download that fails is listed in chybi.txt.
export async function buildArchive(
  data: ExportData,
  downloads: Download[],
  fetchBytes: (url: string) => Promise<Uint8Array>,
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {
    'nahravky.csv': encoder.encode(toCsv(recordingRows(data))),
    'profil.json': encoder.encode(profileJson(data)),
    'PRECTI-ME.txt': encoder.encode(
      'Tvoje data z aplikace Muzio (ZUŠ Moravský Krumlov).\r\n\r\n' +
        'nahravky.csv – všechny nahrávky s hodnocením a komentáři (otevře se v Excelu)\r\n' +
        'profil.json – profil, XP, hvězdy, třídy, odznaky a souhlas\r\n' +
        'nahravky/ – zvuk nahrávek\r\n' +
        'komentare/ – hlasové komentáře a obrázky od učitele\r\n',
    ),
  }
  const missing: string[] = []
  let done = 0
  onProgress?.(0, downloads.length)
  for (const item of downloads) {
    try {
      files[item.path] = await fetchBytes(item.url)
    } catch {
      missing.push(item.path)
    }
    onProgress?.(++done, downloads.length)
  }
  if (missing.length > 0) {
    files['chybi.txt'] = encoder.encode(`Tyto soubory se nepodařilo stáhnout:\r\n${missing.join('\r\n')}\r\n`)
  }
  return files
}

export async function zipFiles(files: Record<string, Uint8Array>): Promise<Blob> {
  const { zipSync } = await import('fflate')
  // Sound and pictures are compressed already: stored as they are.
  const entries = Object.fromEntries(
    Object.entries(files).map(([path, bytes]) => [path, [bytes, { level: /\.(csv|json|txt)$/.test(path) ? 6 : 0 }]]),
  ) as Parameters<typeof zipSync>[0]
  const zipped = zipSync(entries)
  return new Blob([zipped as BlobPart], { type: 'application/zip' })
}
