// Industry and market cap per stock from Finnhub's company profile (free). Industry
// warns about concentration; market cap puts contract awards in proportion.
import { getJson, sleep } from '../http.mjs'
import { cached, HOUR } from '../cache.mjs'

export async function loadSectors(symbols) {
  const key = process.env.FINNHUB_API_KEY
  const bySymbol = new Map()
  if (!key) return { ok: false, error: 'FINNHUB_API_KEY not set', count: 0, fetchedAt: Date.now(), bySymbol }
  let errors = 0
  let streak = 0
  let lastError
  for (const symbol of symbols) {
    try {
      const res = await cached(`profile-${symbol}`, 30 * 24 * HOUR, async () => {
        const json = await getJson(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${key}`)
        await sleep(1100) // shares the 60 calls/min free limit with the insider source
        // marketCapitalization is in millions of USD
        return { industry: json.finnhubIndustry || null, marketCap: json.marketCapitalization ? json.marketCapitalization * 1e6 : null }
      })
      if (res.data.industry || res.data.marketCap) bySymbol.set(symbol, res.data)
      streak = 0
    } catch (err) {
      errors++
      lastError = err
      if (++streak >= 4) break
    }
  }
  return { ok: errors < symbols.length / 2, error: lastError?.message, count: bySymbol.size, fetchedAt: Date.now(), bySymbol }
}
