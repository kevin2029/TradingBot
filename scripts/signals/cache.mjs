// File cache so slow-moving sources are not re-fetched every run.
// In GitHub Actions the folder is persisted between runs with actions/cache.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const CACHE_DIR = process.env.SIGNALS_CACHE_DIR || '.signals-cache'

function pathFor(key) {
  return join(CACHE_DIR, `${key.replace(/[^a-z0-9_.-]/gi, '_')}.json`)
}

export async function readCache(key) {
  try {
    return JSON.parse(await readFile(pathFor(key), 'utf8'))
  } catch {
    return null
  }
}

export async function writeCache(key, data) {
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(pathFor(key), JSON.stringify({ savedAt: Date.now(), data }))
}

/**
 * Return cached data younger than ttlMs, otherwise call loader() and cache it.
 * If the loader fails and stale data exists, the stale copy is returned with
 * `stale: true` so one flaky source does not wipe its signal.
 */
export async function cached(key, ttlMs, loader) {
  const hit = await readCache(key)
  if (hit && Date.now() - hit.savedAt < ttlMs) return { data: hit.data, fromCache: true, savedAt: hit.savedAt }
  try {
    const data = await loader()
    await writeCache(key, data)
    return { data, fromCache: false, savedAt: Date.now() }
  } catch (err) {
    if (hit) return { data: hit.data, fromCache: true, stale: true, savedAt: hit.savedAt, error: err }
    throw err
  }
}

export const HOUR = 3600000
