// Daily price history (1 year) for technical analysis and charts.
// Primary: Yahoo Finance chart endpoint (no key, unofficial). Fallback: Stooq CSV.
import { getJson, getText, sleep } from '../http.mjs'
import { cached } from '../cache.mjs'

export const attribution = { label: 'Prices: Yahoo Finance / Stooq', url: 'https://finance.yahoo.com' }

async function fromYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&includePrePost=false`
  const json = await getJson(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } })
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error(json?.chart?.error?.description || 'empty chart')
  const ts = result.timestamp || []
  const closes = result.indicators?.quote?.[0]?.close || []
  const volumes = result.indicators?.quote?.[0]?.volume || []
  const bars = []
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] == null) continue
    bars.push([ts[i] * 1000, round(closes[i]), volumes[i] || 0])
  }
  return { bars, name: result.meta?.longName || result.meta?.shortName || null }
}

async function fromStooq(symbol) {
  const s = `${symbol.toLowerCase().replace('.', '-')}.us`
  const csv = await getText(`https://stooq.com/q/d/l/?s=${s}&i=d`)
  const lines = csv.trim().split('\n').slice(1)
  const bars = lines
    .map((l) => l.split(','))
    .filter((c) => c.length >= 5 && c[4] !== 'N/D')
    .map((c) => [new Date(`${c[0]}T21:00:00Z`).getTime(), round(Number(c[4])), Number(c[5]) || 0])
    .slice(-260)
  if (bars.length < 2) throw new Error('no stooq data')
  return { bars, name: null }
}

const round = (n) => Math.round(n * 100) / 100

export async function loadPrices(symbols) {
  const out = new Map()
  let errors = 0
  let lastError
  for (const symbol of symbols) {
    try {
      const res = await cached(`price-${symbol}`, 30 * 60 * 1000, async () => {
        try {
          return await fromYahoo(symbol)
        } catch (err) {
          return await fromStooq(symbol).catch(() => {
            throw err
          })
        } finally {
          await sleep(350)
        }
      })
      if (res.data.bars.length >= 2) out.set(symbol, res.data)
    } catch (err) {
      errors++
      lastError = err
    }
  }
  return {
    ok: out.size > 0 && errors < symbols.length / 2,
    error: lastError ? `${errors} symbols failed: ${lastError.message}` : undefined,
    count: out.size,
    fetchedAt: Date.now(),
    bySymbol: out,
  }
}
