// Replays the position-plan rules over the past ~2 years of daily prices.
//
// Historical Congress, insider, lobbying and WSB data are not available per day,
// so the backtest uses the chart signal only: the rating comes from the technical
// component (12-1 momentum and 52 week high ranked across the universe each day,
// plus the trend filter). Entries and exits follow plan.mjs:
//   buy-now  -> buy at the next day's close
//   pullback -> within 10 days, buy when the low reaches the zone and the day closes above the prior high
//   wait     -> within 10 days, buy on a close above the trigger with volume >= 1.5x the 20 day average
// Then: stop on a close below it, half at target 1 (stop to entry), trailing 3 ATR stop for the rest,
// 30 trading day time stop. Results are in R (profit divided by the risk to the stop). No costs or slippage.
//
// To keep it honest it also reports:
//   - three stop variants (tight, wide, trend) side by side
//   - random entries with the same exits (does the entry signal add anything?)
//   - each trade's return against the S&P 500 over the same days
import { technicals, technicalComponent } from './score.mjs'
import { tradePlan, TRAIL_ATR, TIME_STOP_DAYS, STOP_MODES, DEFAULT_STOP_MODE } from './plan.mjs'

const WARMUP = 260 // 12-1 momentum needs a year of history
const PENDING_DAYS = 10

function ratingFromTech(score) {
  if (score == null) return 'avoid'
  if (score > 0.45) return 'strong-buy'
  if (score > 0.25) return 'buy'
  if (score > 0) return 'watch'
  return 'avoid'
}

const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10)

/** Pre-computed S&P 500 context (regime, 3 month return, close) per date. */
export function spyContext(spyBars) {
  const closes = spyBars.map((b) => b[1])
  const byTs = new Map()
  let s50 = 0
  let s200 = 0
  for (let i = 0; i < closes.length; i++) {
    s50 += closes[i]
    s200 += closes[i]
    if (i >= 50) s50 -= closes[i - 50]
    if (i >= 200) s200 -= closes[i - 200]
    const m50 = i >= 49 ? s50 / 50 : null
    const m200 = i >= 199 ? s200 / 200 : null
    const c = closes[i]
    const regime = m50 == null ? 'neutral' : c > m50 && (m200 == null || c > m200) ? 'risk-on' : m200 != null && c < m200 ? 'risk-off' : 'neutral'
    const back = closes[i - 63]
    byTs.set(dayKey(spyBars[i][0]), { regime, ret63: back ? c / back - 1 : 0, close: c })
  }
  return byTs
}

/** Fast 12-1 momentum and 52 week high proximity per bar, for the daily cross-sectional ranks. */
function rankInputs(bars) {
  const out = []
  for (let i = 0; i < bars.length; i++) {
    const c21 = bars[i - 21]?.[1]
    const c252 = bars[i - 252]?.[1]
    let hi = 0
    for (let k = Math.max(0, i - 251); k <= i; k++) hi = Math.max(hi, bars[k][3] ?? bars[k][1])
    out.push({ mom: c21 && c252 ? c21 / c252 - 1 : null, prox: hi ? bars[i][1] / hi : null })
  }
  return out
}

function percentile(sorted, v) {
  if (v == null || !sorted?.length) return null
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < v) lo = mid + 1
    else hi = mid
  }
  return sorted.length > 1 ? lo / (sorted.length - 1) : 0.5
}

/** Technicals for every day of one stock (shared by all stop variants). */
function dailyTechs(bars, inputs, ranksByDate, spy) {
  const techs = []
  for (let i = WARMUP; i < bars.length - 1; i++) {
    const t = technicals(bars.slice(0, i + 1))
    const d = dayKey(bars[i][0])
    const ctx = spy?.get(d)
    t.rs63 = ctx ? t.ret63 - ctx.ret63 : null
    const r = ranksByDate.get(d)
    t.momPct = percentile(r?.mom, inputs[i].mom)
    t.highPct = percentile(r?.prox, inputs[i].prox)
    techs[i] = { t, rating: ratingFromTech(technicalComponent(t).score), regime: ctx?.regime }
  }
  return techs
}

/** Walk one trade forward from its entry. */
function runTrade(bars, entryIdx, planStop, atr) {
  const n = bars.length
  const entry = bars[entryIdx][1]
  let stop = Math.min(planStop, entry - 0.5 * atr)
  const risk = entry - stop
  if (!(risk > 0)) return null
  const target1 = entry + 2 * risk
  const trailDist = TRAIL_ATR * atr
  let half = false
  let highest = entry
  let exitIdx = -1
  let exitPrice = entry
  let reason = 'open'
  for (let k = entryIdx + 1; k < n; k++) {
    const [, c, , h = c] = bars[k]
    if (!half && h >= target1) {
      half = true
      stop = Math.max(stop, entry)
    }
    highest = Math.max(highest, c)
    const activeStop = half ? Math.max(stop, highest - trailDist) : stop
    if (c < activeStop) {
      exitIdx = k
      exitPrice = c
      reason = half ? 'trailing stop' : 'stop'
      break
    }
    if (!half && k - entryIdx >= TIME_STOP_DAYS) {
      exitIdx = k
      exitPrice = c
      reason = 'time stop'
      break
    }
  }
  if (exitIdx < 0) {
    exitIdx = n - 1
    exitPrice = bars[n - 1][1]
  }
  const restR = (exitPrice - entry) / risk
  const r = half ? 0.5 * 2 + 0.5 * restR : restR
  const ret = half ? 0.5 * (target1 / entry - 1) + 0.5 * (exitPrice / entry - 1) : exitPrice / entry - 1
  return { entryIdx, exitIdx, r, ret, reason }
}

function finish(bars, tr, action, spy) {
  const entryAt = dayKey(bars[tr.entryIdx][0])
  const exitAt = dayKey(bars[tr.exitIdx][0])
  const s0 = spy?.get(entryAt)?.close
  const s1 = spy?.get(exitAt)?.close
  return {
    action,
    entryAt,
    exitAt,
    days: tr.exitIdx - tr.entryIdx,
    r: Math.round(tr.r * 100) / 100,
    ret: Math.round(tr.ret * 10000) / 10000,
    excess: s0 && s1 ? Math.round((tr.ret - (s1 / s0 - 1)) * 10000) / 10000 : null,
    reason: tr.reason,
    open: tr.reason === 'open',
  }
}

/** Simulate one stock with one stop variant. */
function simulate(bars, techs, stopMode, spy) {
  const trades = []
  const n = bars.length
  let i = WARMUP
  while (i < n - 1) {
    const day = techs[i]
    if (!day) {
      i++
      continue
    }
    const slice = bars.slice(0, i + 1)
    const plan = tradePlan(slice, day.t, day.rating, { regime: day.regime, now: bars[i][0], stopMode })
    if (!plan || plan.action === 'avoid') {
      i++
      continue
    }
    let entryIdx = -1
    if (plan.action === 'buy-now') entryIdx = i + 1
    else {
      const vol20 = day.t.volume20 || 0
      for (let j = i + 1; j < Math.min(n, i + 1 + PENDING_DAYS); j++) {
        const [, c, v, , l = c] = bars[j]
        const prevHigh = bars[j - 1][3] ?? bars[j - 1][1]
        if (plan.action === 'pullback' && l <= plan.entryHigh && c > prevHigh && c > plan.stop) {
          entryIdx = j
          break
        }
        if (plan.action === 'wait' && c > plan.entryLow && (!vol20 || v >= 1.5 * vol20)) {
          entryIdx = j
          break
        }
      }
    }
    if (entryIdx < 0 || entryIdx >= n) {
      i += plan.action === 'buy-now' ? 1 : PENDING_DAYS
      continue
    }
    const tr = runTrade(bars, entryIdx, plan.stop, plan.avgMove)
    if (!tr) {
      i = entryIdx + 1
      continue
    }
    trades.push(finish(bars, tr, plan.action, spy))
    i = tr.exitIdx + 1
  }
  return trades
}

/** Same exits, random entry days: the bar the entry signal has to clear. */
function simulateRandom(bars, techs, count, seed, spy) {
  const trades = []
  const n = bars.length
  let s = seed
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  let busyUntil = -1
  for (let tries = 0; trades.length < count && tries < count * 20; tries++) {
    const i = WARMUP + Math.floor(rnd() * (n - 2 - WARMUP))
    if (i <= busyUntil || !techs[i]) continue
    const plan = tradePlan(bars.slice(0, i + 1), techs[i].t, 'buy', { now: bars[i][0], stopMode: DEFAULT_STOP_MODE })
    if (!plan) continue
    const tr = runTrade(bars, i + 1, plan.stop, plan.avgMove)
    if (!tr) continue
    trades.push(finish(bars, tr, 'random', spy))
    busyUntil = tr.exitIdx
  }
  return trades
}

export function summarize(trades) {
  const closed = trades.filter((t) => !t.open)
  if (!closed.length) return { trades: 0, open: trades.length - closed.length }
  const wins = closed.filter((t) => t.r > 0)
  const grossWin = wins.reduce((a, t) => a + t.r, 0)
  const grossLoss = closed.filter((t) => t.r <= 0).reduce((a, t) => a - t.r, 0)
  let streak = 0
  let maxStreak = 0
  for (const t of closed) {
    streak = t.r <= 0 ? streak + 1 : 0
    maxStreak = Math.max(maxStreak, streak)
  }
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
  const ex = closed.filter((t) => t.excess != null)
  return {
    trades: closed.length,
    open: trades.length - closed.length,
    winRate: Math.round((wins.length / closed.length) * 1000) / 1000,
    avgR: Math.round(avg(closed.map((t) => t.r)) * 100) / 100,
    totalR: Math.round(closed.reduce((a, t) => a + t.r, 0) * 10) / 10,
    profitFactor: grossLoss ? Math.round((grossWin / grossLoss) * 100) / 100 : null,
    avgReturn: Math.round(avg(closed.map((t) => t.ret)) * 10000) / 10000,
    avgExcess: ex.length ? Math.round(avg(ex.map((t) => t.excess)) * 10000) / 10000 : null,
    beatSpy: ex.length ? Math.round((ex.filter((t) => t.excess > 0).length / ex.length) * 1000) / 1000 : null,
    avgDays: Math.round(avg(closed.map((t) => t.days))),
    maxLosingStreak: maxStreak,
    bestR: Math.max(...closed.map((t) => t.r)),
    worstR: Math.min(...closed.map((t) => t.r)),
  }
}

/**
 * Backtest every stock and return an overall summary (default stop), one per buy type,
 * one per stock, and a comparison of stop variants and random entries.
 * @param {Map<string, {bars: Array}>} pricesBySymbol
 */
export function runBacktest(pricesBySymbol, symbols, spyBars) {
  const spy = spyBars ? spyContext(spyBars) : null
  const usable = symbols.filter((s) => (pricesBySymbol.get(s)?.bars.length ?? 0) > WARMUP + 20)

  // daily cross-sectional ranks of momentum and 52w-high proximity
  const inputs = new Map(usable.map((s) => [s, rankInputs(pricesBySymbol.get(s).bars)]))
  const ranksByDate = new Map()
  for (const s of usable) {
    const bars = pricesBySymbol.get(s).bars
    const inp = inputs.get(s)
    for (let i = WARMUP; i < bars.length; i++) {
      const d = dayKey(bars[i][0])
      const r = ranksByDate.get(d) ?? { mom: [], prox: [] }
      if (inp[i].mom != null) r.mom.push(inp[i].mom)
      if (inp[i].prox != null) r.prox.push(inp[i].prox)
      ranksByDate.set(d, r)
    }
  }
  for (const r of ranksByDate.values()) {
    r.mom.sort((a, b) => a - b)
    r.prox.sort((a, b) => a - b)
  }

  const byMode = { tight: [], wide: [], trend: [] }
  const random = []
  const bySymbol = {}
  let from = null
  let to = null
  usable.forEach((s, idx) => {
    const bars = pricesBySymbol.get(s).bars
    const techs = dailyTechs(bars, inputs.get(s), ranksByDate, spy)
    for (const mode of Object.keys(byMode)) {
      const trades = simulate(bars, techs, mode, spy)
      for (const t of trades) byMode[mode].push({ ...t, symbol: s })
      if (mode === DEFAULT_STOP_MODE) {
        bySymbol[s] = summarize(trades)
        random.push(...simulateRandom(bars, techs, Math.max(trades.length, 1), 1000 + idx * 7919, spy))
      }
    }
    const f = dayKey(bars[WARMUP][0])
    const l = dayKey(bars[bars.length - 1][0])
    if (!from || f < from) from = f
    if (!to || l > to) to = l
  })
  const main = byMode[DEFAULT_STOP_MODE].sort((a, b) => a.exitAt.localeCompare(b.exitAt))
  const byAction = {}
  for (const a of ['buy-now', 'pullback', 'wait']) byAction[a] = summarize(main.filter((t) => t.action === a))
  const variants = {}
  for (const [mode, trades] of Object.entries(byMode)) {
    variants[mode] = { label: STOP_MODES[mode].label, ...summarize(trades.sort((a, b) => a.exitAt.localeCompare(b.exitAt))) }
  }
  variants.random = { label: 'Random entries, same exits', ...summarize(random.sort((a, b) => a.exitAt.localeCompare(b.exitAt))) }
  const spyFrom = from && spy?.get(from)?.close
  const spyTo = to && spy?.get(to)?.close
  return {
    from,
    to,
    stocks: usable.length,
    stopMode: DEFAULT_STOP_MODE,
    overall: summarize(main),
    byAction,
    variants,
    spyReturn: spyFrom && spyTo ? Math.round((spyTo / spyFrom - 1) * 10000) / 10000 : null,
    bySymbol,
    note: 'Chart signal only (no historical Congress, insider, lobbying or WSB data). Entries at the daily close, no costs or slippage. "vs S&P" compares each trade with the S&P 500 over the same days. Past results do not predict future ones.',
  }
}
