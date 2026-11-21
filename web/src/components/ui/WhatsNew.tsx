import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { changelogDate, entriesFor, markSeen, unseenEntry, type ChangelogEntry } from '../../lib/changelog'

function Entry({ entry }: { entry: ChangelogEntry }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-heading font-semibold">{entry.title}</h3>
        <span className="text-xs text-text-muted whitespace-nowrap">{changelogDate(entry.date)}</span>
      </div>
      <ul className="mt-1.5 list-disc pl-5 space-y-1 text-sm text-text-muted">
        {entry.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

// Shows the newest "Co je nového" once, the first time the app is opened
// after it was added (lib/changelog.ts).
export function WhatsNewOnce({ role }: { role: 'student' | 'teacher' }) {
  const [entry, setEntry] = useState(() => unseenEntry(role))
  if (!entry) return null
  function close() {
    if (entry) markSeen(entry.id)
    setEntry(undefined)
  }
  return (
    <Modal open onClose={close}>
      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-lg">Co je nového</h2>
        <Entry entry={entry} />
        <Button className="w-full" onClick={close}>
          Rozumím
        </Button>
      </div>
    </Modal>
  )
}

// The whole list, from Settings.
export function WhatsNewModal({ role, open, onClose }: { role: 'student' | 'teacher'; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-lg">Co je nového</h2>
        <div className="max-h-[60vh] overflow-y-auto space-y-5 pr-1">
          {entriesFor(role).map((entry) => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </div>
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </Modal>
  )
}
