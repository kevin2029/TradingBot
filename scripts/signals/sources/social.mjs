// r/wallstreetbets mention ranking from ApeWisdom (free, no key).
// https://apewisdom.io/api/
import { getJson, sleep } from '../http.mjs'
import { cached } from '../cache.mjs'

export const attribution = { label: 'WSB mentions by ApeWisdom', url: 'https://apewisdom.io' }

async function fetchPages() {
  const rows = []
  for (let page = 1; page <= 2; page++) {
    const json = await getJson(`https://apewisdom.io/api/v1.0/filter/wallstreetbets/page/${page}`)
    for (const r of json.results || []) {
      rows.push({
        ticker: String(r.ticker || '').toUpperCase(),
        rank: Number(r.rank),
        mentions: Number(r.mentions) || 0,
        mentions24h: Number(r.mentions_24h_ago) || 0,
        rank24h: Number(r.rank_24h_ago) || null,
        upvotes: Number(r.upvotes) || 0,
      })
    }
    if (!json.pages || page >= json.pages) break
    await sleep(500)
  }
  return rows
}

export async function loadSocial() {
  // refreshed every run (cache only protects against a failed call)
  const res = await cached('social', 20 * 60 * 1000, fetchPages)
  const byTicker = new Map(res.data.filter((r) => r.ticker).map((r) => [r.ticker, r]))
  return { ok: !res.stale, stale: !!res.stale, error: res.error?.message, count: res.data.length, fetchedAt: res.savedAt, byTicker }
}

