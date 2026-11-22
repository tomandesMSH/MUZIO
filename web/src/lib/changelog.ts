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
    id: '2026-11-22-noty-ucitel',
    date: '2026-11-22',
    title: 'Noty v PDF a hromadné označení',
    role: 'teacher',
    items: [
      'K úkolu můžete přiložit i noty v PDF nebo jako fotku. Žáci si je otevřou v telefonu.',
      'Na Přehledu žáků jde všechny zobrazené nahrávky najednou označit jako ohodnocené.',
    ],
  },
  {
    id: '2026-11-22-noty',
    date: '2026-11-22',
    title: 'Noty v telefonu',
    role: 'student',
    items: ['Když učitel přiloží k úkolu noty v PDF nebo jako fotku, otevřeš si je přímo v telefonu.'],
  },
  {
    id: '2026-11-22-pokrok',
    date: '2026-11-22',
    title: 'Tvůj pokrok',
    role: 'student',
    items: ['Ve Zpětné vazbě si pustíš svou první a poslední nahrávku stejné skladby a uslyšíš, jak ses zlepšil(a).'],
  },
  {
    id: '2026-11-22-pokrok-ucitel',
    date: '2026-11-22',
    title: 'Pokrok žáka',
    role: 'teacher',
    items: ['Na kartě žáka je nově „Pokrok žáka“: první a poslední nahrávka stejného úkolu nebo vlastní skladby pod sebou.'],
  },
  {
    id: '2026-11-21-ucitel-kontrola',
    date: '2026-11-21',
    title: 'Nahrávky bez hodnocení',
    role: 'teacher',
    items: [
      'Nahrávku, kterou hodnotit nechcete, můžete přeskočit tlačítkem „Přeskočit hodnocení“. Zmizí z kontroly i z čísla v menu.',
      'Na Přehledu žáků jde nahrávku rovnou „Označit jako ohodnocené“.',
    ],
  },
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
