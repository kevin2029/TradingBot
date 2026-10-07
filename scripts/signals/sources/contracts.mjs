// Federal contract awards from USASpending.gov (free, no key).
// https://api.usaspending.gov/docs/endpoints
import { getJson, isoDate, daysAgo, sleep } from '../http.mjs'
import { cached, HOUR } from '../cache.mjs'

export const attribution = { label: 'Contracts: USASpending.gov', url: 'https://www.usaspending.gov' }

async function fetchAwards() {
  const rows = []
  for (let page = 1; page <= 3; page++) {
    const body = {
      filters: {
        time_period: [{ start_date: isoDate(daysAgo(30)), end_date: isoDate(new Date()) }],
        award_type_codes: ['A', 'B', 'C', 'D'],
      },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Start Date'],
      sort: 'Award Amount',
      order: 'desc',
      limit: 100,
      page,
    }
    const json = await getJson('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeoutMs: 45000,
    })
    for (const r of json.results || []) {
      rows.push({ recipient: r['Recipient Name'], amount: Number(r['Award Amount']) || 0, agency: r['Awarding Agency'] })
    }
    if (!json.page_metadata?.hasNext) break
    await sleep(600)
  }
  return rows
}

export async function loadContracts(tickers) {
  const res = await cached('contracts', 12 * HOUR, fetchAwards)
  const byTicker = new Map()
  let matched = 0
  for (const r of res.data) {
    const t = tickers.match(r.recipient)
    if (!t) continue
    matched++
    const agg = byTicker.get(t) || { amount: 0, awards: 0, agencies: new Set() }
    agg.amount += r.amount
    agg.awards++
    if (r.agency) agg.agencies.add(r.agency)
    byTicker.set(t, agg)
  }
  for (const agg of byTicker.values()) agg.agencies = [...agg.agencies].slice(0, 3)
  return { ok: !res.stale, stale: !!res.stale, error: res.error?.message, count: res.data.length, matched, fetchedAt: res.savedAt, byTicker }
}
