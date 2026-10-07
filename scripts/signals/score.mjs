// Turns raw source aggregates into a 0-100 score per stock, with plain-language reasons.
// Every component returns a value in [-1, 1] (or null when there is no data).

export const WEIGHTS = {
  technical: 0.3,
  congress: 0.2,
  insider: 0.2,
  social: 0.1,
  contracts: 0.1,
  lobbying: 0.1,
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
  return {
    last,
    change1d: prev ? last / prev - 1 : 0,
    ret20: back20 ? last / back20 - 1 : 0,
    sma50: s50,
    sma200: s200,
    rsi14: r,
    vol20: vol,
  }
}

function technicalComponent(t) {
  if (!t) return { score: null, detail: 'No price data' }
  let s = 0
  const bits = []
  if (t.sma50) {
    s += t.last > t.sma50 ? 0.35 : -0.35
    bits.push(t.last > t.sma50 ? 'above 50d avg' : 'below 50d avg')
  }
  if (t.sma50 && t.sma200) {
    s += t.sma50 > t.sma200 ? 0.25 : -0.25
    bits.push(t.sma50 > t.sma200 ? 'uptrend (50d > 200d)' : 'downtrend (50d < 200d)')
  }
  s += Math.tanh(t.ret20 / 0.08) * 0.25
  bits.push(`${pct(t.ret20)} over 20d`)
  if (t.rsi14 != null) {
    if (t.rsi14 > 75) s -= 0.25
    else if (t.rsi14 < 30) s += 0.1
    bits.push(`RSI ${t.rsi14.toFixed(0)}`)
  }
  return { score: clamp(s), detail: bits.join(', ') }
}

function congressComponent(c) {
  if (!c) return { score: null, detail: 'No disclosed trades (90d)' }
  const score = clamp(Math.tanh(c.net / 3) + Math.min(c.buyers - c.sellers, 3) * 0.05)
  return {
    score,
    detail: `${c.buys} buy${c.buys === 1 ? '' : 's'} by ${c.buyers} member${c.buyers === 1 ? '' : 's'}, ${c.sells} sale${c.sells === 1 ? '' : 's'} (90d)`,
  }
}

function insiderComponent(i) {
  if (!i) return { score: null, detail: 'Not checked' }
  if (!i.buyers && !i.sellers) return { score: 0, detail: 'No open-market insider trades (90d)' }
  // Insider buying is a much stronger signal than selling (selling is often planned/tax).
  const score = clamp(Math.tanh(i.buyers * 0.6 + (i.buyValue > 1e6 ? 0.5 : 0)) - Math.min(i.sellers, 8) * 0.04)
  const parts = []
  if (i.buyers) parts.push(`${i.buyers} insider${i.buyers === 1 ? '' : 's'} bought ${money(i.buyValue)}`)
  if (i.sellers) parts.push(`${i.sellers} sold ${money(i.sellValue)}`)
  return { score, detail: `${parts.join(', ')} (90d)` }
}

function socialComponent(s) {
  if (!s) return { score: null, detail: 'Not trending on WSB' }
  const rankScore = clamp(1 - (s.rank - 1) / 50, 0, 1)
  const momentum = (s.mentions - s.mentions24h) / Math.max(s.mentions24h, 5)
  const score = clamp(0.4 * rankScore + 0.6 * Math.tanh(momentum))
  return { score, detail: `#${s.rank} on WSB, ${s.mentions} mentions (${s.mentions24h} a day ago)`, momentum }
}

function contractsComponent(c) {
  if (!c) return { score: null, detail: 'No large federal awards (30d)' }
  const score = clamp(Math.tanh(Math.log10(Math.max(c.amount, 1) / 5e6) / 1.5), 0, 1)
  return { score, detail: `${c.awards} award${c.awards === 1 ? '' : 's'} worth ${money(c.amount)} (30d)` }
}

function lobbyingComponent(l) {
  if (!l) return { score: null, detail: 'No lobbying filings (90d)' }
  const score = clamp(Math.tanh(Math.log10(Math.max(l.amount, 1) / 1e5)) * 0.6, 0, 0.6)
  return { score, detail: `${l.filings} filing${l.filings === 1 ? '' : 's'}, ${money(l.amount)} reported (90d)` }
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

export function scoreStock({ symbol, name, tech, congress, insider, social, contracts, lobbying, regime }) {
  const components = {
    technical: technicalComponent(tech),
    congress: congressComponent(congress),
    insider: insiderComponent(insider),
    social: socialComponent(social),
    contracts: contractsComponent(contracts),
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
  if ((c.lobbying.score ?? 0) > 0.3) reasons.push(`Active lobbying: ${c.lobbying.detail}`)
  if ((c.social.score ?? 0) > 0.3) reasons.push(`Retail attention rising: ${c.social.detail}`)
  if ((c.technical.score ?? 0) > 0.3) reasons.push(`Strong chart: ${c.technical.detail}`)

  if ((c.congress.score ?? 0) < -0.2) risks.push(`Congress selling: ${c.congress.detail}`)
  if ((c.insider.score ?? 0) < -0.15) risks.push(`Insider selling: ${c.insider.detail}`)
  if ((c.technical.score ?? 0) < -0.2) risks.push(`Weak chart: ${c.technical.detail}`)
  if (tech?.rsi14 > 75) risks.push(`Overbought (RSI ${tech.rsi14.toFixed(0)}), pullback risk`)
  if (c.social.momentum > 2) risks.push('Mentions spiked more than 3x in a day, expect high volatility')
  if (tech?.vol20 > 0.04) risks.push(`High volatility (${(tech.vol20 * 100).toFixed(1)}% daily moves)`)
  if (regime === 'risk-off') risks.push('Broad market is in a downtrend')

  const agreeing = Object.values(c).filter((x) => (x.score ?? 0) > 0.2).length

  return { symbol, name, score, rating: rate(score), agreeing, components, reasons, risks }
}
