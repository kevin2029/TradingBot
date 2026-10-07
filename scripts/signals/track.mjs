// Track record: every trading day the "Buy" recommendations are logged with their
// price, and later checked after 1, 4 and 8 weeks (5, 20, 40 trading days) against
// the S&P 500. Unlike the backtest this includes every signal (Congress, insiders...).
//
// The log lives in the pipeline cache and is published as data/track.json, so a
// fresh machine (or a cleared cache) continues from the live site's copy.
import { getJson } from './http.mjs'
import { readCache, writeCache } from './cache.mjs'

const MIRROR_URL = process.env.TRACK_MIRROR_URL || 'https://kevin2029.github.io/TradingBot/data/track.json'
const MAX_DAYS = 200
export const HORIZONS = [
  { key: '1w', days: 5, label: '1 week' },
  { key: '4w', days: 20, label: '4 weeks' },
  { key: '8w', days: 40, label: '8 weeks' },
]

const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10)

export async function loadTrackLog() {
  const hit = await readCache('track-log')
  if (hit?.data?.length) return { log: hit.data, from: 'cache' }
  try {
    const json = await getJson(MIRROR_URL, { timeoutMs: 15000 })
    if (Array.isArray(json?.log)) return { log: json.log, from: 'live site' }
  } catch {
    /* first run anywhere */
  }
  return { log: [], from: 'new' }
}

/** Add today's buy picks once per trading day (date of the latest daily bar). */
export function recordPicks(log, date, recs, spyPrice) {
  if (!date || log.some((e) => e.date === date)) return log
  const picks = recs
    .filter((r) => (r.rating === 'buy' || r.rating === 'strong-buy') && r.plan && r.plan.action !== 'avoid')
    .map((r) => ({ symbol: r.symbol, score: r.score, rating: r.rating, action: r.plan.action, price: r.price.last }))
  const next = [...log, { date, spy: spyPrice ?? null, picks }]
  return next.slice(-MAX_DAYS)
}

/** Symbols whose outcome still needs prices (picks younger than the longest horizon + a margin). */
export function symbolsToPrice(log) {
  return [...new Set(log.slice(-60).flatMap((e) => e.picks.map((p) => p.symbol)))]
}

function forward(bars, date, days) {
  if (!bars) return null
  const idx = bars.findIndex((b) => dayKey(b[0]) >= date)
  if (idx < 0 || idx + days >= bars.length) return null
  return { from: bars[idx][1], to: bars[idx + days][1] }
}

export function evaluateTrack(log, pricesBySymbol) {
  const spyBars = pricesBySymbol.get('SPY')?.bars
  const horizons = {}
  for (const h of HORIZONS) {
    const rows = []
    for (const e of log) {
      const spy = forward(spyBars, e.date, h.days)
      for (const p of e.picks) {
        const f = forward(pricesBySymbol.get(p.symbol)?.bars, e.date, h.days)
        if (!f) continue
        const ret = f.to / f.from - 1
        const spyRet = spy ? spy.to / spy.from - 1 : null
        rows.push({ ret, excess: spyRet == null ? null : ret - spyRet, action: p.action })
      }
    }
    const n = rows.length
    const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
    const ex = rows.filter((r) => r.excess != null)
    horizons[h.key] = {
      label: h.label,
      picks: n,
      avgReturn: n ? round4(avg(rows.map((r) => r.ret))) : null,
      hitRate: n ? round3(rows.filter((r) => r.ret > 0).length / n) : null,
      beatSpy: ex.length ? round3(ex.filter((r) => r.excess > 0).length / ex.length) : null,
      avgExcess: ex.length ? round4(avg(ex.map((r) => r.excess))) : null,
    }
  }
  // latest picks with their result so far
  const recent = []
  for (const e of log.slice(-10).reverse()) {
    for (const p of e.picks) {
      const bars = pricesBySymbol.get(p.symbol)?.bars
      const now = bars?.[bars.length - 1]?.[1]
      recent.push({ date: e.date, symbol: p.symbol, action: p.action, score: p.score, price: p.price, now: now ?? null, ret: now ? round4(now / p.price - 1) : null })
      if (recent.length >= 15) break
    }
    if (recent.length >= 15) break
  }
  return {
    since: log[0]?.date ?? null,
    days: log.length,
    totalPicks: log.reduce((a, e) => a + e.picks.length, 0),
    horizons,
    recent,
  }
}

export async function saveTrackLog(log) {
  await writeCache('track-log', log)
}

const round3 = (v) => Math.round(v * 1000) / 1000
const round4 = (v) => Math.round(v * 10000) / 10000
