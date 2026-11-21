import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { formatBytes } from '../../lib/data/adminUsage'
import { fetchOrphanRecordings, isRecent, restoreOrphanRecordings, type OrphanRecording } from '../../lib/data/orphanRecordings'
import { getErrorMessage } from '../../lib/errors'

// "Ztracené nahrávky" under Využití (migration 0049): sound files without a
// recording, mostly from the old trigger that deleted all but the newest 7.
// Restored ones come back ungraded, marked "Obnovená nahrávka".
export function OrphanRecordings({ onRestored }: { onRestored: () => void }) {
  const [list, setList] = useState<OrphanRecording[]>()
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string>()

  async function search() {
    setBusy(true)
    setResult(undefined)
    try {
      const found = await fetchOrphanRecordings()
      setList(found)
      setChosen(new Set(found.filter((o) => !isRecent(o.created_at)).map((o) => o.name)))
    } catch (err) {
      setResult(getErrorMessage(err, 'Hledání se nepovedlo. Je spuštěná migrace 0049?'))
    } finally {
      setBusy(false)
    }
  }

  async function restore() {
    setBusy(true)
    setResult(undefined)
    try {
      const count = await restoreOrphanRecordings([...chosen])
      setResult(`Obnoveno ${count} nahrávek. Žáci je uvidí jako neohodnocené.`)
      setList(undefined)
      setChosen(new Set())
      onRestored()
    } catch (err) {
      setResult(getErrorMessage(err, 'Obnovení se nepovedlo, zkus to znovu.'))
    } finally {
      setBusy(false)
    }
  }

  function toggle(name: string) {
    const next = new Set(chosen)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setChosen(next)
  }

  return (
    <div className="rounded-2xl bg-bg-card shadow-clay-sm p-4 space-y-3">
      <div>
        <h2 className="font-heading font-semibold text-sm">Ztracené nahrávky</h2>
        <p className="text-xs text-text-muted">
          Zvukové soubory, ke kterým už nepatří žádná nahrávka. Obnovené se žákovi vrátí jako neohodnocené s poznámkou
          Obnovená nahrávka. Soubory z posledních 7 dní nejsou předem zaškrtnuté: žák je možná ještě pošle znovu
          z telefonu.
        </p>
      </div>
      <Button variant="ghost" disabled={busy} onClick={search}>
        Najít
      </Button>
      {list && list.length === 0 && <p className="text-sm text-text-muted">Žádné ztracené nahrávky.</p>}
      {list && list.length > 0 && (
        <>
          <ul className="max-h-72 overflow-y-auto divide-y divide-border text-sm">
            {list.map((o) => (
              <li key={o.name}>
                <label className="flex items-center gap-2 py-1.5">
                  <input type="checkbox" checked={chosen.has(o.name)} onChange={() => toggle(o.name)} />
                  <span className="flex-1 truncate">{o.pupil_name ?? 'Smazaný účet'}</span>
                  <span className="text-xs text-text-muted">{new Date(o.created_at).toLocaleDateString('cs-CZ')}</span>
                  <span className="text-xs text-text-muted w-16 text-right">{formatBytes(o.bytes)}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button disabled={busy || chosen.size === 0} onClick={restore}>
            Obnovit vybrané ({chosen.size})
          </Button>
        </>
      )}
      {result && (
        <p className="text-sm" role="status">
          {result}
        </p>
      )}
    </div>
  )
}
