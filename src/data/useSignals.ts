import { useEffect } from 'react'
import { useAppDispatch } from '../state/store'
import type { SignalsFile } from '../types'

const URL = `${import.meta.env.BASE_URL}data/signals.json`
/** The file is rebuilt hourly by GitHub Actions; re-check every 10 minutes. */
const REFRESH_MS = 10 * 60 * 1000
export const MISSING = 'missing'
const RETRY_MS = import.meta.env.DEV ? 10 * 1000 : 2 * 60 * 1000

export function useSignals() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${URL}?t=${Date.now()}`, { cache: 'no-store' })
        // A missing file comes back as 404, or as index.html from the dev server's SPA fallback.
        const text = res.ok ? await res.text() : ''
        if (res.status === 404 || text.trimStart().startsWith('<')) throw new Error(MISSING)
        if (!res.ok) throw new Error(`Could not load signals (HTTP ${res.status})`)
        const json = JSON.parse(text) as SignalsFile
        if (!json || !Array.isArray(json.recommendations)) throw new Error('signals.json has an unexpected format')
        if (!cancelled) dispatch({ type: 'SIGNALS_LOADED', signals: json })
        if (json.recommendations.length === 0) schedule(RETRY_MS)
        else schedule(REFRESH_MS)
        return
      } catch (err) {
        if (!cancelled) dispatch({ type: 'SIGNALS_ERROR', message: err instanceof Error ? err.message : String(err) })
        // while the pipeline is still building the file, check again soon
        schedule(err instanceof Error && err.message === MISSING ? RETRY_MS : REFRESH_MS)
      }
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    function schedule(ms: number) {
      clearTimeout(timer)
      if (!cancelled) timer = setTimeout(load, ms)
    }
    load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [dispatch])
}
