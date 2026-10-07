// Upcoming earnings dates from Finnhub's free earnings calendar (one call for all stocks).
// A stock can gap 10 to 20% on earnings, straight through a stop, so the plan warns
// about (and avoids new entries just before) a report.
import { getJson, isoDate, daysAgo } from '../http.mjs'
import { cached, HOUR } from '../cache.mjs'

export const attribution = { label: 'Earnings calendar via Finnhub', url: 'https://finnhub.io' }

export async function loadEarnings() {
  const key = process.env.FINNHUB_API_KEY
  if (!key) return { ok: false, error: 'FINNHUB_API_KEY not set', count: 0, fetchedAt: Date.now(), bySymbol: new Map() }
  const res = await cached('earnings', 12 * HOUR, async () => {
    const from = isoDate(daysAgo(1))
    const to = isoDate(daysAgo(-30))
    const json = await getJson(`https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${key}`, { timeoutMs: 30000 })
    return (json.earningsCalendar || []).map((e) => ({ symbol: String(e.symbol || '').toUpperCase(), date: e.date, hour: e.hour || '' }))
  })
  const bySymbol = new Map()
  for (const e of res.data) {
    if (!e.symbol || !e.date) continue
    const prev = bySymbol.get(e.symbol)
    if (!prev || e.date < prev.date) bySymbol.set(e.symbol, e)
  }
  return { ok: !res.stale, stale: !!res.stale, error: res.error?.message, count: bySymbol.size, fetchedAt: res.savedAt, bySymbol }
}
