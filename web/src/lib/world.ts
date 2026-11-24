// The pupil's musical world (migration 0043). The flames (lib/flames.ts)
// move it through four phases; the choice only changes how it looks.

export type WorldId = 'zahradka' | 'hrad' | 'vesmir' | 'podium'

export interface WorldInfo {
  id: WorldId
  name: string
  tagline: string
  // What each of the four phases shows, in order.
  phases: [string, string, string, string]
}

export const WORLDS: WorldInfo[] = [
  {
    id: 'zahradka',
    name: 'Hudební zahrádka',
    tagline: 'Každé cvičení tvoji hudbu zalije.',
    phases: ['Semínko', 'Klíček', 'Pupen', 'Květ'],
  },
  {
    id: 'hrad',
    name: 'Hudební hrad',
    tagline: 'Kámen po kameni, tón po tónu.',
    phases: ['Základní kámen', 'Zdi', 'Věže', 'Vlajky nad hradem'],
  },
  {
    id: 'vesmir',
    name: 'Hudební vesmír',
    tagline: 'Odpočítávání začíná prvním tónem.',
    phases: ['Odpočítávání', 'Vzlet', 'Mezi hvězdami', 'Nová planeta'],
  },
  {
    id: 'podium',
    name: 'Hudební pódium',
    tagline: 'Za oponou čeká tvůj koncert.',
    phases: ['Zkouška', 'Reflektory', 'Plný sál', 'Potlesk'],
  },
]

export const DEFAULT_WORLD: WorldId = 'zahradka'

export function worldInfo(id: string | null | undefined): WorldInfo {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0]
}
