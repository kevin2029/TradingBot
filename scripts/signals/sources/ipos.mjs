// Upcoming and recent IPOs from Finnhub's free IPO calendar (one call).
// New listings have too little history to score, so they are shown separately with
// their lock-up date; once they have about 3 months of prices they join the ranking.
import { getJson, isoDate, daysAgo } from '../http.mjs'
import { cached, HOUR } from '../cache.mjs'

export const attribution = { label: 'IPO calendar via Finnhub', url: 'https://finnhub.io' }

export const LOOKBACK_DAYS = 150
export const AHEAD_DAYS = 30
export const LOCKUP_DAYS = 180
const MIN_DEAL = 50e6 // skip tiny listings when the deal size is known

// blank-check companies (SPACs) are cash shells, not businesses
const SPAC = /\b(acquisition|capital) (corp|corporation|company|co|inc|ltd|limited)\b|\bspac\b|\bblank check\b/i

function parsePrice(p) {
  const nums = String(p ?? '')
    .split('-')
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x) && x > 0)
  if (!nums.length) return { low: null, high: null }
  return { low: Math.min(...nums), high: Math.max(...nums) }
}

export async function loadIpos() {
  const key = process.env.FINNHUB_API_KEY
  if (!key) return { ok: false, error: 'FINNHUB_API_KEY not set', count: 0, fetchedAt: Date.now(), items: [] }
  const res = await cached('ipos', 6 * HOUR, async () => {
    const from = isoDate(daysAgo(LOOKBACK_DAYS))
    const to = isoDate(daysAgo(-AHEAD_DAYS))
    const json = await getJson(`https://finnhub.io/api/v1/calendar/ipo?from=${from}&to=${to}&token=${key}`, { timeoutMs: 30000 })
    return json.ipoCalendar || []
  })
  const items = []
  const seen = new Set()
  for (const r of res.data) {
    const name = String(r.name || '').trim()
    const symbol = String(r.symbol || '').toUpperCase().trim()
    const status = String(r.status || '').toLowerCase()
    if (!name || !r.date || status === 'withdrawn') continue
    if (SPAC.test(name)) continue
    const deal = Number(r.totalSharesValue) || null
    if (deal != null && deal < MIN_DEAL) continue
    const k = symbol || name
    if (seen.has(k)) continue
    seen.add(k)
    const { low, high } = parsePrice(r.price)
    const lockup = new Date(`${r.date}T12:00:00Z`)
    lockup.setUTCDate(lockup.getUTCDate() + LOCKUP_DAYS)
    items.push({
      symbol: /^[A-Z]{1,5}(\.[A-Z])?$/.test(symbol) ? symbol : null,
      name,
      date: r.date,
      exchange: r.exchange || null,
      status: status || 'expected',
      priceLow: low,
      priceHigh: high,
      shares: Number(r.numberOfShares) || null,
      dealValue: deal,
      lockupDate: isoDate(lockup),
    })
  }
  items.sort((a, b) => b.date.localeCompare(a.date))
  return { ok: !res.stale, stale: !!res.stale, error: res.error?.message, count: items.length, fetchedAt: res.savedAt, items }
}
