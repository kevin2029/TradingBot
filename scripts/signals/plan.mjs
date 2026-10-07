// Turns a scored stock into a concrete swing-trade plan: when to buy, where to
// put the stop, where to take profit and when to sell. Mechanical rules only.
//
// v2: true ATR stops, earnings and gap awareness, entry confirmation (volume on
// breakouts, an up-close on dips), relative strength vs the S&P 500, stricter rules
// in a weak market and a trailing stop for the second half instead of a fixed target.
import { atr as trueAtr, sma } from './score.mjs'

const r2 = (n) => Math.round(n * 100) / 100
const pct = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`
const usd = (v) => `$${v.toFixed(2)}`
const shortDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
const vol = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(Math.round(v)))

/** Average absolute daily close-to-close move: fallback when there are no highs/lows. */
export function avgMove(closes, n = 14) {
  const from = Math.max(1, closes.length - n)
  let sum = 0
  for (let i = from; i < closes.length; i++) sum += Math.abs(closes[i] - closes[i - 1])
  return sum / Math.max(1, closes.length - from)
}

export const ACCOUNT_RISK = 0.01 // risk 1% of the account per trade
export const MAX_POSITION = 0.2 // never more than 20% in one stock
export const TRAIL_ATR = 3 // trailing stop distance after target 1
export const EARNINGS_DAYS = 7 // no new entries this close to a report
export const TIME_STOP_DAYS = 30 // trading days to reach target 1

/**
 * Stop placement. Research on stop losses favours wide stops: tight ones get hit by
 * normal noise. 'wide' is the default; the backtest compares all three.
 *  tight: just under the 20 day swing low, 1.5 to 3 ATR below entry (the old rule)
 *  wide:  just under the 20 day swing low, 3 to 4 ATR below entry
 *  trend: under the 50 day average, 2 to 5 ATR below entry
 */
export const STOP_MODES = {
  tight: { min: 1.5, max: 3, label: 'Tight stop (1.5 to 3 ATR)' },
  wide: { min: 3, max: 4, label: 'Wide stop (3 to 4 ATR)' },
  trend: { min: 2, max: 5, label: 'Trend stop (below 50 day average)' },
}
export const DEFAULT_STOP_MODE = 'wide'

/**
 * @param {Array} bars daily [ms, close, volume, high, low], oldest first
 * @param {object} t technicals() output (rs63 filled in)
 * @param {string} rating strong-buy | buy | watch | avoid
 * @param {{ regime?: string, earnings?: {date: string, hour?: string} | null, now?: number }} [ctx]
 */
export function tradePlan(bars, t, rating, ctx = {}) {
  if (!t || bars.length < 30) return null
  const closes = bars.map((b) => b[1])
  const lows = bars.map((b) => b[4] ?? b[1])
  const highs = bars.map((b) => b[3] ?? b[1])
  const last = t.last
  const atr = t.atr14 ?? trueAtr(bars) ?? avgMove(closes) ?? last * 0.02
  const sma20 = sma(closes, 20) ?? last
  const swingLow = Math.min(...lows.slice(-20))
  const high52 = Math.max(...highs.slice(-252))
  const extended = (t.rsi14 ?? 50) > 70 || last > sma20 + 2 * atr
  const rsWeak = t.rs63 != null && t.rs63 < -0.03
  const riskOff = ctx.regime === 'risk-off'
  const now = ctx.now ?? Date.now()

  // worst single day in the last ~3 months: a feel for gap risk
  let worstDay = 0
  for (let i = Math.max(1, closes.length - 63); i < closes.length; i++) worstDay = Math.min(worstDay, closes[i] / closes[i - 1] - 1)

  let earnings = null
  if (ctx.earnings?.date) {
    const days = Math.round((new Date(`${ctx.earnings.date}T12:00:00Z`).getTime() - now) / 86400000)
    if (days >= 0 && days <= 45) earnings = { date: ctx.earnings.date, hour: ctx.earnings.hour || '', days }
  }
  const earningsSoon = earnings != null && earnings.days <= EARNINGS_DAYS

  let action
  let zone
  let summary
  let confirm
  const warnings = []

  if (rating === 'avoid') {
    action = 'avoid'
    const lo = Math.min(Math.max(swingLow, last - 2 * atr), last - atr)
    zone = [r2(lo), r2(last - atr)]
    summary = 'Signals are weak. Do not open a new position; if you already hold it, tighten your stop.'
    confirm = 'No entry.'
  } else if (t.sma50 && last < t.sma50) {
    action = 'wait'
    const trigger = Math.max(t.sma50, last)
    zone = [r2(trigger), r2(trigger + 0.5 * atr)]
    summary = `Below its 50 day average. Wait until it closes above ${usd(trigger)} before buying.`
    confirm = t.volume20
      ? `Buy only after a daily close above ${usd(trigger)} on volume above ${vol(1.5 * t.volume20)} (1.5x the 20 day average). A breakout on low volume often fails.`
      : `Buy only after a daily close above ${usd(trigger)} on above-average volume.`
  } else if (extended || rating === 'watch' || rsWeak || (riskOff && rating !== 'strong-buy')) {
    action = 'pullback'
    // dip zone: around the 20 day average, at least half an ATR wide, never above today's price
    const hi = Math.min(last, Math.max(last - atr, sma20 + 0.25 * atr))
    const lo = Math.min(hi - 0.5 * atr, Math.max(sma20 - 0.5 * atr, last - 2.5 * atr))
    zone = [r2(lo), r2(hi)]
    const why = extended
      ? `Strong but stretched (RSI ${Math.round(t.rsi14 ?? 0)})`
      : rsWeak
        ? `Lagging the S&P 500 over 3 months (${pct(t.rs63)})`
        : riskOff && rating !== 'watch'
          ? 'The market is in a downtrend, so only strong buys qualify right away'
          : 'Mixed signals'
    summary = `${why}. Do not chase: wait for a dip into ${usd(zone[0])} to ${usd(zone[1])}.`
    confirm = "In the zone, wait for a day that closes above the previous day's high, then buy. That shows buyers stepping in instead of catching a falling stock."
  } else {
    action = 'buy-now'
    zone = [r2(last - 0.75 * atr), r2(last + 0.25 * atr)]
    summary = `Trend, momentum and signals line up. Buying between ${usd(zone[0])} and ${usd(zone[1])} is in line with the plan.`
    confirm = t.volume20 && t.volume > 1.5 * t.volume20 ? `Volume today is ${(t.volume / t.volume20).toFixed(1)}x the average, buyers are active.` : 'No extra confirmation needed.'
  }

  // No new entries right before earnings: keep the plan, but block it until after the report.
  const earningsBlock = earningsSoon && action !== 'avoid'
  if (earningsBlock) {
    summary = `Earnings on ${shortDate(earnings.date)} (${earnings.days === 0 ? 'today' : `in ${earnings.days} day${earnings.days === 1 ? '' : 's'}`}). Wait until after the report: a gap can jump straight past the stop. After that: ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`
    confirm = `After the report, re-check the plan before buying. ${confirm}`
  }
  if (earnings) warnings.push(`Earnings on ${shortDate(earnings.date)}${earnings.hour === 'bmo' ? ' before the open' : earnings.hour === 'amc' ? ' after the close' : ''} (in ${earnings.days} days)`)
  if (riskOff) warnings.push('Weak market: position size halved')
  if (rsWeak) warnings.push(`Lagging the S&P 500: ${pct(t.rs63)} over 3 months`)
  if (worstDay < -0.06) warnings.push(`Worst day in 3 months: ${pct(worstDay)}, gaps can skip the stop`)

  const entry = (zone[0] + zone[1]) / 2
  const mode = STOP_MODES[ctx.stopMode ?? DEFAULT_STOP_MODE] ?? STOP_MODES.wide
  const anchor = (ctx.stopMode ?? DEFAULT_STOP_MODE) === 'trend' && t.sma50 ? t.sma50 - 0.5 * atr : swingLow - 0.25 * atr
  let stop = Math.min(anchor, entry - mode.min * atr)
  stop = Math.max(stop, entry - mode.max * atr)
  const risk = entry - stop
  const target1 = entry + 2 * risk
  let target2 = entry + 3.5 * risk
  // Use the 52 week high as target 2 when it sits between the targets (natural resistance).
  if (high52 > target1 * 1.01 && high52 < target2) target2 = high52
  const riskPct = risk / entry
  let positionPct = Math.min(MAX_POSITION, ACCOUNT_RISK / riskPct)
  if (riskOff) positionPct /= 2

  const trail = TRAIL_ATR * atr
  const exitRules = [
    `Stop loss: sell everything if it closes below ${usd(stop)} (${pct(stop / entry - 1)} from entry).`,
    `Gap rule: if it opens below the stop, sell at the open. Do not wait for it to come back.`,
    `Target 1 at ${usd(target1)} (${pct(target1 / entry - 1)}): sell half and move your stop up to your entry price.`,
    `Trailing stop for the rest: ${usd(trail)} (3 ATR) below the highest close since you bought, never below your entry. Sell the rest when it closes below. This lets big winners run.`,
    `Reference target ${usd(target2)} (${pct(target2 / entry - 1)})${high52 === target2 ? ', the 52 week high' : ''}: a sensible place to take more profit if the trend stalls there.`,
    'Signal exit: sell early if the score falls below 45 or insiders and Congress turn to selling.',
    `Time exit: if target 1 is not reached within ${TIME_STOP_DAYS} trading days, free up the money.`,
  ]
  if (earnings && !earningsSoon) exitRules.push(`Earnings on ${shortDate(earnings.date)}: before the report, sell half or accept that the price can gap past your stop.`)

  return {
    action,
    summary,
    confirm,
    warnings,
    entryLow: zone[0],
    entryHigh: zone[1],
    stop: r2(stop),
    target1: r2(target1),
    target2: r2(target2),
    riskPct: Math.round(riskPct * 1000) / 1000,
    rewardRisk: 2,
    positionPct: Math.round(positionPct * 1000) / 1000,
    /** ATR (average true range); name kept for older files */
    avgMove: r2(atr),
    trailDistance: r2(trail),
    earnings,
    earningsBlock,
    rs63: t.rs63,
    riskOff,
    stopMode: ctx.stopMode ?? DEFAULT_STOP_MODE,
    holding: '2 to 8 weeks',
    exitRules,
  }
}
