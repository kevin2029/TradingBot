// Turns raw source aggregates into a 0-100 score per stock, with plain-language reasons.
// Every component returns a value in [-1, 1] (or null when there is no data).

// Weights follow the evidence: momentum and opportunistic insider buying are the
// best documented; Congress (leaders only), lobbying and contracts are weak;
// WSB attention only ever lowers a score (extreme hype tends to precede underperformance).
export const WEIGHTS = {
  technical: 0.45,
  insider: 0.25,
  congress: 0.1,
  social: 0.1,
  contracts: 0.05,
  lobbying: 0.05,
}

const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v))
const pct = (v, dp = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(dp)}%`

export function money(v) {
  const a = Math.abs(v)
  if (a >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

export function sma(values, n) {
  if (values.length < n) return null
  let s = 0
  for (let i = values.length - n; i < values.length; i++) s += values[i]
  return s / n
}

export function rsi(values, n = 14) {
  if (values.length <= n) return null
  let gain = 0
  let loss = 0
  for (let i = 1; i <= n; i++) {
    const d = values[i] - values[i - 1]
    if (d >= 0) gain += d
    else loss -= d
  }
  gain /= n
  loss /= n
  for (let i = n + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    gain = (gain * (n - 1) + Math.max(d, 0)) / n
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n
  }
  if (loss === 0) return 100
  return 100 - 100 / (1 + gain / loss)
}

/** Average true range (Wilder) from [t, close, volume, high, low] bars; falls back to close-to-close moves. */
export function atr(bars, n = 14) {
  if (bars.length < 2) return null
  const tr = []
  for (let i = 1; i < bars.length; i++) {
    const [, c, , h = c, l = c] = bars[i]
    const pc = bars[i - 1][1]
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)))
  }
  if (tr.length < n) return tr.reduce((a, b) => a + b, 0) / tr.length
  let a = tr.slice(0, n).reduce((x, y) => x + y, 0) / n
  for (let i = n; i < tr.length; i++) a = (a * (n - 1) + tr[i]) / n
  return a
}

export function technicals(bars) {
  const closes = bars.map((b) => b[1])
  const last = closes[closes.length - 1]
  const prev = closes[closes.length - 2] ?? last
  const back20 = closes[closes.length - 21] ?? closes[0]
  const s50 = sma(closes, 50)
  const s200 = sma(closes, 200)
  const r = rsi(closes)
  // 20-day realised volatility (daily stdev)
  const rets = []
  for (let i = Math.max(1, closes.length - 20); i < closes.length; i++) rets.push(closes[i] / closes[i - 1] - 1)
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1)
  const vol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1))
  const back63 = closes[closes.length - 64] ?? closes[0]
  // 12 month momentum skipping the latest month (Jegadeesh & Titman); needs ~1 year of data
  const c21 = closes[closes.length - 22]
  const c252 = closes[closes.length - 253]
  const mom12_1 = c21 && c252 ? c21 / c252 - 1 : null
  const highs = bars.slice(-252).map((b) => b[3] ?? b[1])
  const high52 = highs.length ? Math.max(...highs) : null
  const vols = bars.map((b) => b[2] || 0)
  const vol20avg = sma(vols.slice(0, -1), 20)
  return {
    last,
    change1d: prev ? last / prev - 1 : 0,
    ret20: back20 ? last / back20 - 1 : 0,
    ret63: back63 ? last / back63 - 1 : 0,
    /** 3 month return minus the S&P 500's, filled in by build-signals */
    rs63: null,
    mom12_1,
    /** price as a fraction of the 52 week high (George & Hwang) */
    // needs most of a year, otherwise a new listing is always 'near its high'
    high52prox: high52 && bars.length >= 200 ? last / high52 : null,
    /** cross-sectional percentiles (0..1) within the universe, filled in by build-signals */
    momPct: null,
    highPct: null,
    atr14: atr(bars),
    volume: vols[vols.length - 1] || 0,
    volume20: vol20avg || 0,
    sma50: s50,
    sma200: s200,
    rsi14: r,
    vol20: vol,
  }
}

/**
 * Chart signal. Core: 12-1 month momentum and closeness to the 52 week high, both ranked
 * against the universe (percentiles). Plus a long-term trend filter and a small penalty
 * for being very overbought.
 */
export function technicalComponent(t) {
  if (!t) return { score: null, detail: 'No price data' }
  let s = 0
  const bits = []
  if (t.momPct != null) {
    s += 0.45 * (2 * t.momPct - 1)
    bits.push(`momentum ${pct(t.mom12_1 ?? 0)} (12-1m, top ${Math.max(1, Math.round((1 - t.momPct) * 100))}%)`)
  } else if (t.mom12_1 != null) {
    s += 0.45 * Math.tanh(t.mom12_1 / 0.3)
    bits.push(`momentum ${pct(t.mom12_1)} (12-1m)`)
  }
  if (t.highPct != null && t.high52prox != null) {
    s += 0.25 * (2 * t.highPct - 1)
    bits.push(`${Math.round(t.high52prox * 100)}% of 52w high`)
  }
  if (t.sma200) {
    const up = t.last > t.sma200 && (!t.sma50 || t.sma50 > t.sma200)
    const down = t.last < t.sma200
    s += up ? 0.3 : down ? -0.3 : 0
    bits.push(up ? 'uptrend (above 200d)' : down ? 'below 200d avg' : 'mixed trend')
  } else if (t.sma50) {
    s += t.last > t.sma50 ? 0.15 : -0.15
    bits.push(t.last > t.sma50 ? 'above 50d avg' : 'below 50d avg')
  }
  if (t.rsi14 != null) {
    if (t.rsi14 > 80) s -= 0.15
    bits.push(`RSI ${t.rsi14.toFixed(0)}`)
  }
  return { score: clamp(s), detail: bits.join(', ') }
}

function congressComponent(c) {
  if (!c) return { score: null, detail: 'No disclosed trades (90d)' }
  // net is already weighted: party leaders 3x, other members 0.3x (see congress.mjs)
  const score = clamp(Math.tanh(c.net / 3))
  const lead = c.leaders?.length ? `, incl. leader${c.leaders.length === 1 ? '' : 's'} ${c.leaders.join(', ')}` : ''
  return {
    score,
    detail: `${c.buys} buy${c.buys === 1 ? '' : 's'}, ${c.sells} sale${c.sells === 1 ? '' : 's'} by ${c.buyers + c.sellers} member${c.buyers + c.sellers === 1 ? '' : 's'}${lead} (90d)`,
  }
}

function insiderComponent(i) {
  if (!i) return { score: null, detail: 'Not checked' }
  if (!i.buyers && !i.sellers) return { score: 0, detail: 'No open-market insider trades (90d)' }
  // Only opportunistic trades carry information (Cohen, Malloy & Pomorski); unclassified
  // insiders (too little history) count half, routine ones not at all. Several buyers at
  // once (a cluster) is the strongest version.
  const opp = i.oppBuyers ?? i.buyers
  const unc = i.unclassBuyers ?? 0
  const cluster = opp + unc >= 3
  const buy = Math.tanh(opp * 0.7 + unc * 0.35 + (cluster ? 0.5 : 0))
  const sell = Math.min((i.oppSellers ?? 0) * 0.08 + (i.unclassSellers ?? 0) * 0.03, 0.4)
  const score = clamp(buy - sell)
  const parts = []
  if (i.buyers) {
    const kinds = [i.oppBuyers ? `${i.oppBuyers} opportunistic` : '', i.unclassBuyers ? `${i.unclassBuyers} new` : '', i.routineBuyers ? `${i.routineBuyers} routine` : '']
      .filter(Boolean)
      .join(', ')
    parts.push(`${i.buyers} insider${i.buyers === 1 ? '' : 's'} bought ${money(i.buyValue)}${kinds ? ` (${kinds})` : ''}${cluster ? ', cluster buy' : ''}`)
  }
  if (i.sellers) parts.push(`${i.sellers} sold ${money(i.sellValue)}${i.oppSellers ? ` (${i.oppSellers} opportunistic)` : ''}`)
  return { score, detail: `${parts.join('; ')} (90d)` }
}

function socialComponent(s) {
  if (!s) return { score: null, detail: 'Not trending on WSB' }
  // Contrarian: attention never adds points; a spike or top-10 hype is a warning.
  const momentum = (s.mentions - s.mentions24h) / Math.max(s.mentions24h, 5)
  let score = 0
  if (momentum > 2) score = -0.6
  else if (s.rank <= 10 && momentum > 0.5) score = -0.3
  else if (s.rank <= 10) score = -0.1
  return { score, detail: `#${s.rank} on WSB, ${s.mentions} mentions (${s.mentions24h} a day ago)${score < 0 ? ', hype is a contrarian warning' : ''}`, momentum }
}

function contractsComponent(c, marketCap) {
  if (!c) return { score: null, detail: 'No large federal awards (30d)' }
  // Only awards that are big relative to the company matter (the stock already reacted on announcement).
  if (marketCap) {
    const ratio = c.amount / marketCap
    const score = clamp(Math.tanh(ratio / 0.005), 0, 1)
    return { score, detail: `${c.awards} award${c.awards === 1 ? '' : 's'} worth ${money(c.amount)} (${(ratio * 100).toFixed(2)}% of market cap, 30d)` }
  }
  const score = clamp(Math.tanh(Math.log10(Math.max(c.amount, 1) / 5e6) / 1.5), 0, 1) * 0.5
  return { score, detail: `${c.awards} award${c.awards === 1 ? '' : 's'} worth ${money(c.amount)} (30d)` }
}

function lobbyingComponent(trend) {
  // The change in spending says more than the level.
  if (!trend || (!trend.cur && !trend.prev)) return { score: null, detail: 'No lobbying spend reported' }
  if (trend.growth == null) return { score: 0.3, detail: `New lobbying: ${money(trend.cur)} this year, none in the same period last year` }
  const score = clamp(Math.tanh(trend.growth * 1.5), -0.5, 0.6)
  return { score, detail: `${money(trend.cur)} this year vs ${money(trend.prev)} same period last year (${pct(trend.growth, 0)})` }
}

export function marketRegime(benchmarks) {
  const spy = benchmarks.find((b) => b.symbol === 'SPY')
  if (!spy || !spy.sma50) return { regime: 'neutral', summary: 'Not enough index data to judge the trend.' }
  const above50 = spy.last > spy.sma50
  const above200 = spy.sma200 ? spy.last > spy.sma200 : above50
  if (above50 && above200)
    return { regime: 'risk-on', summary: `S&P 500 is above its 50 and 200 day averages (${pct(spy.ret20)} over 20 days). Trend favours buyers.` }
  if (!above200)
    return { regime: 'risk-off', summary: `S&P 500 is below its 200 day average (${pct(spy.ret20)} over 20 days). Be selective and size small.` }
  return { regime: 'neutral', summary: `S&P 500 is between its 50 and 200 day averages (${pct(spy.ret20)} over 20 days). Mixed trend.` }
}

export function rate(score) {
  if (score >= 68) return 'strong-buy'
  if (score >= 58) return 'buy'
  if (score >= 45) return 'watch'
  return 'avoid'
}

export function scoreStock({ symbol, name, tech, congress, insider, social, contracts, lobbying, regime, marketCap }) {
  const components = {
    technical: technicalComponent(tech),
    congress: congressComponent(congress),
    insider: insiderComponent(insider),
    social: socialComponent(social),
    contracts: contractsComponent(contracts, marketCap),
    lobbying: lobbyingComponent(lobbying),
  }

  let raw = 0
  for (const [k, w] of Object.entries(WEIGHTS)) raw += w * (components[k].score ?? 0)
  // Missing data counts as neutral, so a stock needs several agreeing sources to score high.
  let score = 50 + 50 * raw
  if (regime === 'risk-off') score -= 5
  if (regime === 'risk-on') score += 2
  score = Math.round(clamp(score, 0, 100))

  const reasons = []
  const risks = []
  const c = components
  if ((c.congress.score ?? 0) > 0.2) reasons.push(`Congress buying: ${c.congress.detail}`)
  if ((c.insider.score ?? 0) > 0.2) reasons.push(`Insider buying: ${c.insider.detail}`)
  if ((c.contracts.score ?? 0) > 0.3) reasons.push(`Government contracts: ${c.contracts.detail}`)
  if ((c.lobbying.score ?? 0) > 0.3) reasons.push(`Lobbying spend rising: ${c.lobbying.detail}`)
  if ((c.technical.score ?? 0) > 0.3) reasons.push(`Strong momentum: ${c.technical.detail}`)

  if ((c.congress.score ?? 0) < -0.2) risks.push(`Congress selling: ${c.congress.detail}`)
  if ((c.insider.score ?? 0) < -0.15) risks.push(`Insider selling: ${c.insider.detail}`)
  if ((c.technical.score ?? 0) < -0.2) risks.push(`Weak momentum: ${c.technical.detail}`)
  if (tech?.rsi14 > 80) risks.push(`Overbought (RSI ${tech.rsi14.toFixed(0)}), pullback risk`)
  if ((c.social.score ?? 0) < 0) risks.push(`Retail hype on WSB: ${c.social.detail}. Extreme attention has tended to come before weaker returns`)
  if ((c.lobbying.score ?? 0) < -0.2) risks.push(`Lobbying spend falling: ${c.lobbying.detail}`)
  if (tech?.vol20 > 0.04) risks.push(`High volatility (${(tech.vol20 * 100).toFixed(1)}% daily moves)`)
  if (regime === 'risk-off') risks.push('Broad market is in a downtrend')

  const agreeing = Object.values(c).filter((x) => (x.score ?? 0) > 0.2).length

  return { symbol, name, score, rating: rate(score), agreeing, components, reasons, risks }
}
