import { useEffect } from 'react'
import { useAppDispatch } from '../state/store'
import type { SignalsFile } from '../types'

const URL = `${import.meta.env.BASE_URL}data/signals.json`
/** The file is rebuilt hourly by GitHub Actions; re-check every 10 minutes. */
const REFRESH_MS = 10 * 60 * 1000

export function useSignals() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${URL}?t=${Math.floor(Date.now() / REFRESH_MS)}`, { cache: 'no-cache' })
        if (res.status === 404) throw new Error('No signals yet. Run "npm run signals" locally, or wait for the first scheduled build.')
        if (!res.ok) throw new Error(`Could not load signals (HTTP ${res.status})`)
        const json = (await res.json()) as SignalsFile
        if (!cancelled) dispatch({ type: 'SIGNALS_LOADED', signals: json })
      } catch (err) {
        if (!cancelled) dispatch({ type: 'SIGNALS_ERROR', message: err instanceof Error ? err.message : String(err) })
      }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [dispatch])
}
