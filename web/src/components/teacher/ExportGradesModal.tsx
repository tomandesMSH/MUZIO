import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useAuth } from '../../lib/AuthProvider'
import { useQuery } from '../../lib/data/useQuery'
import { fetchReviewContext } from '../../lib/data/classrooms'
import { fetchLogsForExport } from '../../lib/data/practiceLogs'
import { fetchPiecesByIds } from '../../lib/data/ownPieces'
import { downloadCsv } from '../../lib/csv'
import { detailRows, exportFilename, periodRange, schoolHalves, summaryRows, type Period } from '../../lib/gradesExport'
import { getErrorMessage } from '../../lib/errors'
import type { Profile } from '../../lib/data/types'

type PeriodChoice = 'first' | 'second' | 'custom'
const ALL = 'all'

const chip = (on: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-heading font-semibold transition ${
    on ? 'bg-coral text-white shadow-clay-sm' : 'bg-bg-card-alt text-text-muted hover:text-text-primary'
  }`

// "⬇ Export známek": grades of all pupils or one class for a half-year (or
// any dates) as a CSV for Excel - an overview per pupil or every recording.
export function ExportGradesModal({ students, onClose }: { students: Profile[]; onClose: () => void }) {
  const { profile } = useAuth()
  const halves = schoolHalves(new Date())
  const [group, setGroup] = useState(ALL)
  const [choice, setChoice] = useState<PeriodChoice>(new Date().getMonth() >= 1 && new Date().getMonth() <= 6 ? 'second' : 'first')
  const [custom, setCustom] = useState<Period>(halves.first)
  const [busy, setBusy] = useState<'prehled' | 'detail'>()
  const [message, setMessage] = useState<string>()
  const context = useQuery(() => (profile ? fetchReviewContext(profile.id, []) : Promise.resolve(undefined)), [profile?.id])

  const classrooms = context.data?.classrooms ?? []
  const period = choice === 'custom' ? custom : halves[choice]
  const groupName = group === ALL ? 'všichni' : (classrooms.find((c) => c.id === group)?.name ?? 'třída')
  const pupils = students
    .filter((s) => s.is_approved)
    .filter((s) => group === ALL || context.data?.membersOf.get(group)?.has(s.id))
  const validPeriod = !!period.from && !!period.to && period.from <= period.to

  async function download(kind: 'prehled' | 'detail') {
    if (!profile) return
    setBusy(kind)
    setMessage(undefined)
    try {
      const { fromIso, toIso } = periodRange(period)
      const logs = await fetchLogsForExport(
        pupils.map((p) => p.id),
        fromIso,
        toIso,
      )
      let rows
      if (kind === 'prehled') rows = summaryRows(pupils, logs)
      else {
        const assignmentIds = [...new Set(logs.flatMap((l) => (l.assignment_id ? [l.assignment_id] : [])))]
        const pieceIds = [...new Set(logs.flatMap((l) => (l.own_piece_id ? [l.own_piece_id] : [])))]
        const [ctx, pieces] = await Promise.all([
          fetchReviewContext(profile.id, assignmentIds),
          fetchPiecesByIds(pieceIds).catch(() => new Map()),
        ])
        const pieceTitles = new Map([...pieces].map(([id, piece]) => [id, piece.title as string]))
        rows = detailRows(pupils, logs, ctx.titles, pieceTitles)
      }
      downloadCsv(exportFilename(kind, groupName, period), rows)
      setMessage(`Staženo (${logs.length} nahrávek)`)
    } catch (err) {
      setMessage(getErrorMessage(err, 'Export se nepovedl, zkus to znovu.'))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <Modal open onClose={onClose}>
      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-lg">Export známek</h2>
        <div>
          <div className="text-xs font-semibold text-text-muted mb-1.5">Koho</div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Koho">
            <button type="button" role="radio" aria-checked={group === ALL} onClick={() => setGroup(ALL)} className={chip(group === ALL)}>
              Všichni moji žáci
            </button>
            {classrooms.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={group === c.id}
                onClick={() => setGroup(c.id)}
                className={chip(group === c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">Žáků: {pupils.length}</p>
        </div>
        <div>
          <div className="text-xs font-semibold text-text-muted mb-1.5">Období</div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Období">
            {(
              [
                ['first', '1. pololetí'],
                ['second', '2. pololetí'],
                ['custom', 'Vlastní'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={choice === id} onClick={() => setChoice(id)} className={chip(choice === id)}>
                {label}
              </button>
            ))}
          </div>
          {choice === 'custom' ? (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="date"
                aria-label="Od"
                value={custom.from}
                onChange={(e) => setCustom({ ...custom, from: e.target.value })}
                className="rounded-lg bg-bg-card-alt px-2 py-1.5 shadow-clay-press"
              />
              až
              <input
                type="date"
                aria-label="Do"
                value={custom.to}
                onChange={(e) => setCustom({ ...custom, to: e.target.value })}
                className="rounded-lg bg-bg-card-alt px-2 py-1.5 shadow-clay-press"
              />
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-text-muted">
              {new Date(period.from).toLocaleDateString('cs-CZ')} až {new Date(period.to).toLocaleDateString('cs-CZ')}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Button className="w-full" disabled={!!busy || !validPeriod || pupils.length === 0} onClick={() => void download('prehled')}>
            {busy === 'prehled' ? 'Připravuji…' : '⬇ Přehled (řádek za žáka)'}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={!!busy || !validPeriod || pupils.length === 0}
            onClick={() => void download('detail')}
          >
            {busy === 'detail' ? 'Připravuji…' : '⬇ Všechny nahrávky s komentáři'}
          </Button>
          <p className="text-[11px] text-text-muted">
            Soubor CSV se otevře v Excelu (nebo Tabulkách Google). Noty jsou hodnocení 1 až 5 z Muzia, ne školní známky.
          </p>
          {message && <p className="text-sm text-text-muted" role="status">{message}</p>}
        </div>
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </Modal>
  )
}
