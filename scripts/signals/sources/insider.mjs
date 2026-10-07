// Insider (Form 4) transactions per symbol from Finnhub's free tier, 4 years of
// history so routine and opportunistic insiders can be told apart.
// Needs FINNHUB_API_KEY (free at https://finnhub.io/register). 60 calls/min.
import { getJson, isoDate, daysAgo, sleep } from '../http.mjs'
import { cached, HOUR } from '../cache.mjs'

export const attribution = { label: 'Insider trades via Finnhub', url: 'https://finnhub.io' }

/**
 * Cohen, Malloy & Pomorski (2012): an insider who trades in the same calendar month
 * in each of the previous 3 years is "routine" (predicts nothing). One who traded in
 * each of those years but not on that pattern is "opportunistic" (information-rich).
 * Insiders with less history are "unclassified" and count half.
 */
function classify(trades, date) {
  const y = Number(date.slice(0, 4))
  const m = date.slice(5, 7)
  const years = [y - 1, y - 2, y - 3]
  const tradedInYear = years.every((yy) => trades.some((t) => t.date.startsWith(String(yy))))
  if (!tradedInYear) return 'unclassified'
  const sameMonth = years.every((yy) => trades.some((t) => t.date.startsWith(`${yy}-${m}`)))
  return sameMonth ? 'routine' : 'opportunistic'
}

function summarize(rows) {
  const since = isoDate(daysAgo(90))
  // every open-market trade per insider over the whole history
  const byInsider = new Map()
  for (const r of rows) {
    if (r.transactionCode !== 'P' && r.transactionCode !== 'S') continue
    const date = r.transactionDate || r.filingDate || ''
    if (!date) continue
    const list = byInsider.get(r.name) || []
    const shares = Math.abs(Number(r.change) || 0)
    const price = Number(r.transactionPrice) || 0
    list.push({ date, filed: r.filingDate || date, code: r.transactionCode, shares, price, value: shares * price })
    byInsider.set(r.name, list)
  }
  const out = { buyers: 0, sellers: 0, buyValue: 0, sellValue: 0, oppBuyers: 0, oppSellers: 0, routineBuyers: 0, routineSellers: 0, unclassBuyers: 0, unclassSellers: 0, recent: [] }
  for (const [name, trades] of byInsider) {
    const recent = trades.filter((t) => t.date >= since)
    if (!recent.length) continue
    const first = recent.sort((a, b) => a.date.localeCompare(b.date))[0]
    const kind = classify(trades.filter((t) => t.date < first.date.slice(0, 4)), first.date)
    const bought = recent.some((t) => t.code === 'P')
    const sold = recent.some((t) => t.code === 'S')
    const key = kind === 'opportunistic' ? 'opp' : kind === 'routine' ? 'routine' : 'unclass'
    // the individual trades for the activity feed (Form 4 data is public)
    for (const t of recent) out.recent.push({ insider: name, date: t.date, filed: t.filed, code: t.code, shares: t.shares, price: Math.round(t.price * 100) / 100, value: Math.round(t.value), kind })
    if (bought) {
      out.buyers++
      out[`${key}Buyers`]++
      out.buyValue += recent.filter((t) => t.code === 'P').reduce((a, t) => a + t.value, 0)
    }
    if (sold) {
      out.sellers++
      out[`${key}Sellers`]++
      out.sellValue += recent.filter((t) => t.code === 'S').reduce((a, t) => a + t.value, 0)
    }
  }
  out.recent.sort((a, b) => b.filed.localeCompare(a.filed) || b.date.localeCompare(a.date))
  out.recent = out.recent.slice(0, 25)
  return out
}

export async function loadInsider(symbols) {
  const key = process.env.FINNHUB_API_KEY
  const byTicker = new Map()
  if (!key) return { ok: false, error: 'FINNHUB_API_KEY not set', count: 0, fetchedAt: Date.now(), byTicker }

  let errors = 0
  let streak = 0
  let lastError
  let oldest = Date.now()
  let done = 0
  for (const symbol of symbols) {
    if (++done % 10 === 0) console.log(`[signals] insider: ${done} of ${symbols.length}`)
    try {
      const res = await cached(`insider3-${symbol}`, 12 * HOUR, async () => {
        const url = `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${encodeURIComponent(symbol)}&from=${isoDate(daysAgo(4 * 365))}&token=${key}`
        const json = await getJson(url)
        await sleep(1100) // stay under 60/min
        return summarize(json.data || [])
      })
      oldest = Math.min(oldest, res.savedAt)
      byTicker.set(symbol, res.data)
      streak = 0
    } catch (err) {
      errors++
      lastError = err
      // Source is down (or the network is): stop instead of failing 50 more times.
      if (++streak >= 4) {
        lastError = new Error(`stopped after ${streak} failures in a row: ${err.message}`)
        errors = symbols.length
        break
      }
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
