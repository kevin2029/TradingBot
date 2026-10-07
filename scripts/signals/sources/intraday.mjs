// Intraday bars from Yahoo's chart endpoint for the 1D and 1W chart ranges:
// today's 5 minute bars (incl. pre-market / after-hours) and the last 5 trading
// days in 30 minute bars (regular session). Cached 10 minutes.
import { getJson, sleep } from '../http.mjs'
import { cached } from '../cache.mjs'

const r2 = (n) => Math.round(n * 100) / 100

async function fetchWeek(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=30m&includePrePost=false`
  const json = await getJson(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } })
  const res = json?.chart?.result?.[0]
  if (!res) return []
  const ts = res.timestamp || []
  const closes = res.indicators?.quote?.[0]?.close || []
  const bars = []
  for (let i = 0; i < ts.length; i++) if (closes[i] != null) bars.push([ts[i], r2(closes[i])])
  return bars
}

async function fetchDay(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=true`
  const json = await getJson(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } })
  const res = json?.chart?.result?.[0]
  if (!res) throw new Error(json?.chart?.error?.description || 'empty chart')
  const meta = res.meta || {}
  const period = meta.currentTradingPeriod || {}
  const ts = res.timestamp || []
  const closes = res.indicators?.quote?.[0]?.close || []
  const bars = []
  for (let i = 0; i < ts.length; i++) if (closes[i] != null) bars.push([ts[i], r2(closes[i])])
  return {
    bars,
    prevClose: meta.chartPreviousClose ?? meta.previousClose ?? null,
    regularPrice: meta.regularMarketPrice ?? null,
    regularTime: meta.regularMarketTime ?? null,
    pre: period.pre ? [period.pre.start, period.pre.end] : null,
    regular: period.regular ? [period.regular.start, period.regular.end] : null,
    post: period.post ? [period.post.start, period.post.end] : null,
  }
}

function summarize(d) {
  const inRange = (r) => (r ? d.bars.filter(([t]) => t >= r[0] && t < r[1]) : [])
  const pre = inRange(d.pre)
  const regular = inRange(d.regular)
  const post = inRange(d.post)
  const last = (arr) => (arr.length ? arr[arr.length - 1] : null)
  // During pre-market the "previous close" is yesterday's close; after the open it is today's open reference.
  const prev = d.prevClose
  const regularClose = regular.length ? last(regular)[1] : null
  const session = (bars, base) => {
    const l = last(bars)
    if (!l || !base) return null
    const prices = bars.map((b) => b[1])
    return { price: l[1], ts: l[0], change: l[1] / base - 1, high: Math.max(...prices), low: Math.min(...prices) }
  }
  return {
    prevClose: prev,
    pre: session(pre, prev),
    // after-hours moves are measured against today's regular close
    post: session(post, regularClose ?? d.regularPrice),
    regularClose,
    periods: { pre: d.pre, regular: d.regular, post: d.post },
    bars: d.bars,
    week: d.week ?? [],
  }
}

export async function loadIntraday(symbols) {
  const out = new Map()
  let errors = 0
  let streak = 0
  let lastError
  let done = 0
  for (const symbol of symbols) {
    if (++done % 10 === 0) console.log(`[signals] intraday: ${done} of ${symbols.length}`)
    try {
      const res = await cached(`intraday-${symbol}`, 10 * 60 * 1000, async () => {
        try {
          const day = await fetchDay(symbol)
          await sleep(250)
          // the week view is optional: a failure here should not drop the day data
          const week = await fetchWeek(symbol).catch(() => [])
          return { ...day, week }
        } finally {
          await sleep(250)
        }
      })
      out.set(symbol, summarize(res.data))
      streak = 0
    } catch (err) {
      errors++
      lastError = err
      if (++streak >= 4) {
        lastError = new Error(`stopped after ${streak} failures in a row: ${err.message}`)
        errors = symbols.length
        break
      }
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

export const attribution = { label: 'Pre-market & intraday: Yahoo Finance', url: 'https://finance.yahoo.com' }
