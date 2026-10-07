// Lobbying disclosures (LD-2) from the official LDA API (formerly lda.senate.gov).
// Anonymous access is throttled; set LDA_API_KEY for a higher limit.
// https://lda.gov/api/redoc/v1/
import { getJson, isoDate, daysAgo, sleep } from '../http.mjs'
import { cached, HOUR } from '../cache.mjs'

export const attribution = { label: 'Lobbying: LDA.gov', url: 'https://lda.gov' }

async function fetchFilings() {
  const key = process.env.LDA_API_KEY
  const headers = key ? { Authorization: `Token ${key}` } : {}
  const since = isoDate(daysAgo(90))
  const rows = []
  let url = `https://lda.gov/api/v1/filings/?filing_dt_posted_after=${since}&ordering=-dt_posted&page_size=25`
  for (let page = 0; page < (key ? 12 : 6) && url; page++) {
    const json = await getJson(url, { headers, timeoutMs: 30000 })
    for (const f of json.results || []) {
      const amount = Number(f.income || 0) + Number(f.expenses || 0)
      if (f.dt_posted && f.dt_posted.slice(0, 10) < since) continue
      rows.push({ client: f.client?.name, registrant: f.registrant?.name, amount })
    }
    url = json.next || null
    await sleep(key ? 500 : 4500)
  }
  return rows
}

export async function loadLobbying(tickers) {
  const res = await cached('lobbying', 24 * HOUR, fetchFilings)
  const byTicker = new Map()
  for (const r of res.data) {
    // In-house filings list the company as both client and registrant.
    const t = tickers.match(r.client) || tickers.match(r.registrant)
    if (!t) continue
    const agg = byTicker.get(t) || { amount: 0, filings: 0 }
    agg.amount += r.amount
    agg.filings++
    byTicker.set(t, agg)
  }
  return { ok: !res.stale, stale: !!res.stale, error: res.error?.message, count: res.data.length, fetchedAt: res.savedAt, byTicker }
}
