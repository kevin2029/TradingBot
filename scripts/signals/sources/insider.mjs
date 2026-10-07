// Insider (Form 4) transactions per symbol from Finnhub's free tier.
// Needs FINNHUB_API_KEY (free at https://finnhub.io/register). 60 calls/min.
import { getJson, isoDate, daysAgo, sleep } from '../http.mjs'
import { cached, HOUR } from '../cache.mjs'

export const attribution = { label: 'Insider trades via Finnhub', url: 'https://finnhub.io' }

function summarize(rows) {
  const since = isoDate(daysAgo(90))
  const buyers = new Set()
  const sellers = new Set()
  let buyValue = 0
  let sellValue = 0
  for (const r of rows) {
    const date = r.transactionDate || r.filingDate || ''
    if (date < since) continue
    const value = Math.abs(Number(r.change) || 0) * (Number(r.transactionPrice) || 0)
    // P = open-market purchase, S = open-market sale. Awards/options (A, M, F, G) are ignored.
    if (r.transactionCode === 'P') {
      buyers.add(r.name)
      buyValue += value
    } else if (r.transactionCode === 'S') {
      sellers.add(r.name)
      sellValue += value
    }
  }
  return { buyers: buyers.size, sellers: sellers.size, buyValue, sellValue }
}

export async function loadInsider(symbols) {
  const key = process.env.FINNHUB_API_KEY
  const byTicker = new Map()
  if (!key) return { ok: false, error: 'FINNHUB_API_KEY not set', count: 0, fetchedAt: Date.now(), byTicker }

  let errors = 0
  let lastError
  let oldest = Date.now()
  for (const symbol of symbols) {
    try {
      const res = await cached(`insider-${symbol}`, 12 * HOUR, async () => {
        const url = `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${encodeURIComponent(symbol)}&from=${isoDate(daysAgo(90))}&token=${key}`
        const json = await getJson(url)
        await sleep(1100) // stay under 60/min
        return summarize(json.data || [])
      })
      oldest = Math.min(oldest, res.savedAt)
      byTicker.set(symbol, res.data)
    } catch (err) {
      errors++
      lastError = err
    }
  }
  return {
    ok: errors < symbols.length / 2,
    error: lastError ? `${errors} symbols failed: ${lastError.message}` : undefined,
    count: byTicker.size,
    fetchedAt: oldest,
    byTicker,
  }
}
