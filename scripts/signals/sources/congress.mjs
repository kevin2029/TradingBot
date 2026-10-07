// Congress stock trades (House Clerk + Senate eFD PTRs) via Bargo's free API.
// https://www.bargo.ai/free-apis/congress  Attribution to Bargo is required and
// raw records must not be redistributed, so only per-ticker aggregates are kept.
import { getJson, isoDate, daysAgo, sleep } from '../http.mjs'
import { cached, HOUR } from '../cache.mjs'

const BASE = 'https://www.bargo.ai/free-apis/congress/v1'

export const attribution = { label: 'Congress trades by Bargo', url: 'https://www.bargo.ai/free-apis/congress' }

function amountWeight(range) {
  // "$1,001 - $15,000" -> lower bound 1001
  const lower = Number(String(range || '').replace(/[$,]/g, '').match(/\d+/)?.[0] || 1000)
  if (lower >= 1000000) return 4
  if (lower >= 250000) return 3
  if (lower >= 100000) return 2.5
  if (lower >= 50000) return 2
  if (lower >= 15000) return 1.5
  return 1
}

function side(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('purchase') || t.includes('buy')) return 'buy'
  if (t.includes('sale') || t.includes('sell')) return 'sell'
  return null
}

async function fetchTrades() {
  const key = process.env.BARGO_API_KEY
  const limit = key ? 250 : 100
  // Keyless: 100 rows/day. Free key: 1,000 rows/day. Cached for 24h.
  const maxPages = key ? 4 : 1
  const headers = key ? { Authorization: `Bearer ${key}`, 'X-API-Key': key } : {}
  const from = isoDate(daysAgo(90))
  const all = []
  for (let page = 0; page < maxPages; page++) {
    const url = `${BASE}/trades?from=${from}&limit=${limit}&page=${page}`
    const json = await getJson(url, { headers })
    const rows = Array.isArray(json) ? json : json.trades || json.data || []
    // keep only what the scorer needs
    for (const r of rows) {
      const s = side(r.type)
      const ticker = String(r.ticker || '').toUpperCase().trim()
      if (!s || !ticker || ticker === '--') continue
      all.push({
        ticker,
        side: s,
        member: r.member_slug || r.member || 'unknown',
        date: r.transaction_date || r.disclosure_date,
        weight: amountWeight(r.amount_range),
      })
    }
    if (rows.length < limit) break
    await sleep(800)
  }
  return all
}

/** @returns {Promise<{ok:boolean,error?:string,byTicker:Map<string,object>,fetchedAt:number}>} */
export async function loadCongress() {
  const res = await cached('congress', 24 * HOUR, fetchTrades)
  const now = Date.now()
  const byTicker = new Map()
  for (const t of res.data) {
    const ageDays = Math.max(0, (now - new Date(t.date).getTime()) / 86400000) || 45
    const decay = Math.pow(0.5, ageDays / 30) // 30-day half-life
    const agg = byTicker.get(t.ticker) || { buys: 0, sells: 0, buyers: new Set(), sellers: new Set(), net: 0, latest: null }
    if (t.side === 'buy') {
      agg.buys++
      agg.buyers.add(t.member)
      agg.net += t.weight * decay
    } else {
      agg.sells++
      agg.sellers.add(t.member)
      agg.net -= t.weight * decay
    }
    if (!agg.latest || t.date > agg.latest) agg.latest = t.date
    byTicker.set(t.ticker, agg)
  }
  for (const agg of byTicker.values()) {
    agg.buyers = agg.buyers.size
    agg.sellers = agg.sellers.size
  }
  return {
    ok: !res.stale,
    stale: !!res.stale,
    error: res.error?.message,
    count: res.data.length,
    fetchedAt: res.savedAt,
    byTicker,
  }
}
