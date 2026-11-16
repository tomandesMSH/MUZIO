// A screen's file failed to download (offline, or replaced by a newer deploy).
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch/i.test(message)
}
