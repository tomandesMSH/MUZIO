// Migrace z Base44 (api/migrate.ts, migration 0055): the e-mail from the old
// app gets a code; with the code a new Muzio account is made and the flames,
// stars and badges come over.

export interface MigrationSummary {
  flames: number
  stars: number
  badges: number
  messages?: number
}

export interface MigrationDetails {
  email: string
  code: string
  username: string
  fullName: string
  password: string
  dateOfBirth: string
  guardianName?: string
}

async function post(body: unknown): Promise<{ summary?: MigrationSummary }> {
  let response: Response
  try {
    response = await fetch('/api/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Nepodařilo se spojit se serverem. Zkontroluj připojení.')
  }
  const data = (await response.json().catch(() => ({}))) as { error?: string; summary?: MigrationSummary }
  if (!response.ok) throw new Error(data.error ?? 'Něco se nepovedlo, zkus to prosím znovu.')
  return data
}

export async function requestMigrationCode(email: string): Promise<void> {
  await post({ step: 'request', email: email.trim() })
}

export async function completeMigration(details: MigrationDetails): Promise<MigrationSummary> {
  const { summary } = await post({
    step: 'complete',
    ...details,
    email: details.email.trim(),
    code: details.code.trim(),
    username: details.username.trim().toLowerCase(),
  })
  return summary ?? { flames: 0, stars: 0, badges: 0 }
}
