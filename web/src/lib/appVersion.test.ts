import { describe, expect, it, vi } from 'vitest'
import { fetchDeployedVersion, isNewVersion } from './appVersion'

describe('app version', () => {
  it('reads the deployed version, without the cache', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ version: 'abc123' })))
    expect(await fetchDeployedVersion(fetcher as unknown as typeof fetch)).toBe('abc123')
    expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/^\/version\.json\?t=\d+$/), { cache: 'no-store' })
  })

  it('offline or missing file: unknown, no banner', async () => {
    expect(await fetchDeployedVersion((async () => { throw new Error('offline') }) as unknown as typeof fetch)).toBeUndefined()
    expect(await fetchDeployedVersion((async () => new Response('nope', { status: 404 })) as unknown as typeof fetch)).toBeUndefined()
    expect(isNewVersion('abc', undefined)).toBe(false)
  })

  it('a different build is new; never in development', () => {
    expect(isNewVersion('abc', 'def')).toBe(true)
    expect(isNewVersion('abc', 'abc')).toBe(false)
    expect(isNewVersion('dev', 'def')).toBe(false)
  })
})
