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
    name: 'Strom zpěvných ptáků',
    tagline: 'Čím víc hraješ, tím víc jich přiletí.',
    phases: ['Kmen', 'Větve', 'Listí', 'Ptáci zpívají'],
  },
  {
    id: 'hrad',
    name: 'Hudební hrad',
    tagline: 'Kámen po kameni, tón po tónu.',
    phases: ['Základní kámen', 'Zdi', 'Věže', 'Vlajky nad hradem'],
  },
  {
    id: 'vesmir',
    name: 'Hudební vláček',
    tagline: 'Každý tón je další kus kolejí.',
    phases: ['Koleje', 'Lokomotiva', 'Vagony', 'Nádraží a odjezd'],
  },
  {
    id: 'podium',
    name: 'Houslařská dílna',
    tagline: 'Z kusu dřeva vlastní nástroj.',
    phases: ['Prkno a šablona', 'Tělo', 'Krk a šnek', 'Struny a smyčec'],
  },
]

export const DEFAULT_WORLD: WorldId = 'zahradka'

export function worldInfo(id: string | null | undefined): WorldInfo {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0]
}
