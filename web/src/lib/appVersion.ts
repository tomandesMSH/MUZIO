// Is a newer Muzio deployed than the one running? The build writes its id to
// /version.json (vite.config.ts). An installed app or a tab left open for
// days would otherwise keep running old code.
export const CHECK_EVERY_MS = 10 * 60_000

export async function fetchDeployedVersion(fetcher: typeof fetch = fetch): Promise<string | undefined> {
  try {
    const response = await fetcher(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) return undefined
    const data = (await response.json()) as { version?: unknown }
    return typeof data.version === 'string' ? data.version : undefined
  } catch {
    return undefined
  }
}

// True when the server has a different (newer) build than this one.
export function isNewVersion(running: string, deployed: string | undefined): boolean {
  return running !== 'dev' && !!deployed && deployed !== running
}
