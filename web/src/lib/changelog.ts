// "Co je nového": hand-written notes about changes people will notice, the
// newest first. A new entry (a new id) shows once to everyone after they open
// the app (components/ui/WhatsNew.tsx). Keep the items short and plain.

export interface ChangelogEntry {
  id: string // stable, e.g. '2026-11-21'
  date: string // YYYY-MM-DD
  title: string
  items: string[]
  // Only for one role; both when left out.
  role?: 'student' | 'teacher'
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-11-21',
    date: '2026-11-21',
    title: 'Hudební svět a plamínky',
    role: 'student',
    items: [
      'Za každý den, kdy pošleš nahrávku, dostaneš plamínek. Dny nemusí jít po sobě.',
      'Vyber si svůj hudební svět: zahrádku, hrad, vesmír nebo pódium. Každých 7 plamínků se posune o fázi dál.',
      'Nové odznaky od učitele: Lovec not, Akordový kouzelník, Rytmický mistr, Velký pokrok, Malý skladatel, Odvážný muzikant a Koncertní hvězda.',
      'Nahrávky starší než 30 dní si můžeš stáhnout do zařízení.',
      'Po odeslání nahrávky zazní krátký zvuk. Vypnout ho jde v Nastavení.',
      'Chybu v aplikaci můžeš nahlásit v Nastavení.',
    ],
  },
  {
    id: '2026-11-21-ucitel',
    date: '2026-11-21',
    title: 'Plamínky, světy a nové odznaky',
    role: 'teacher',
    items: [
      'Žáci dostávají plamínek za každý den s nahrávkou a staví si svůj hudební svět ve 4 fázích.',
      'Při hodnocení můžete dát sedm nových odznaků: Lovec not, Akordový kouzelník, Rytmický mistr, Velký pokrok, Malý skladatel, Odvážný muzikant a Koncertní hvězda.',
      'Žáci si mohou stáhnout nahrávky starší než 30 dní.',
      'Chybu v aplikaci můžete nahlásit v Nastavení.',
    ],
  },
]

const STORAGE_KEY = 'muzio-changelog-seen'

export function entriesFor(role: 'student' | 'teacher'): ChangelogEntry[] {
  return CHANGELOG.filter((e) => !e.role || e.role === role)
}

// The newest entry this person hasn't seen yet, if any. The very first time
// (nothing stored) the newest one is shown too.
export function unseenEntry(role: 'student' | 'teacher'): ChangelogEntry | undefined {
  const newest = entriesFor(role)[0]
  if (!newest) return undefined
  try {
    return localStorage.getItem(STORAGE_KEY) === newest.id ? undefined : newest
  } catch {
    // No storage: don't show it on every page.
    return undefined
  }
}

export function markSeen(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Shown again next time.
  }
}

// "21. 11. 2026"
export function changelogDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return `${d}. ${m}. ${y}`
}
