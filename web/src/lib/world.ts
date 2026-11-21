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
    tagline: 'Nech svou hudbu rozkvést.',
    phases: ['Kořínky', 'Dva lístky', 'Poupě', 'Rozkvetlá rostlina'],
  },
  {
    id: 'hrad',
    name: 'Hudební hrad',
    tagline: 'Postav si vlastní hudební království.',
    phases: ['Základy hradu', 'Hradby', 'Věže', 'Hotový hrad s vlajkami'],
  },
  {
    id: 'vesmir',
    name: 'Hudební vesmír',
    tagline: 'Vydej se s hudbou až ke hvězdám.',
    phases: ['Raketa na rampě', 'Start', 'Na oběžné dráze', 'Přistání na planetě'],
  },
  {
    id: 'podium',
    name: 'Hudební pódium',
    tagline: 'Staň se hvězdou vlastního koncertu.',
    phases: ['Opona se otevírá', 'Světla', 'Klavír', 'Koncert'],
  },
]

export const DEFAULT_WORLD: WorldId = 'zahradka'

export function worldInfo(id: string | null | undefined): WorldInfo {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0]
}
