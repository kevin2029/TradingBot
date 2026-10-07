// Turns a scored stock into a concrete swing-trade plan: when to buy, where to
// put the stop, where to take profit and when to sell. Mechanical rules only.
import { sma } from './score.mjs'

const r2 = (n) => Math.round(n * 100) / 100
const pct = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`
const usd = (v) => `$${v.toFixed(2)}`

/** Average absolute daily move over n days, a close-only stand-in for ATR. */
export function avgMove(closes, n = 14) {
  const from = Math.max(1, closes.length - n)
  let sum = 0
  for (let i = from; i < closes.length; i++) sum += Math.abs(closes[i] - closes[i - 1])
  return sum / Math.max(1, closes.length - from)
}

export const ACCOUNT_RISK = 0.01 // risk 1% of the account per trade
export const MAX_POSITION = 0.2 // never more than 20% in one stock

/**
 * @param {number[]} closes daily closes, oldest first
 * @param {object} t technicals() output
 * @param {string} rating strong-buy | buy | watch | avoid
 */
export function tradePlan(closes, t, rating) {
  if (!t || closes.length < 30) return null
  const last = t.last
  const atr = avgMove(closes) || last * 0.02
  const sma20 = sma(closes, 20) ?? last
  const swingLow = Math.min(...closes.slice(-20))
  const high52 = Math.max(...closes.slice(-252))
  const extended = (t.rsi14 ?? 50) > 70 || last > sma20 + 2 * atr

  let action
  let zone
  let summary
  if (rating === 'avoid') {
    action = 'avoid'
    zone = [r2(Math.max(swingLow, last - 2 * atr)), r2(last - atr)]
    summary = 'Signals are weak. Do not open a new position; if you already hold it, tighten your stop.'
  } else if (t.sma50 && last < t.sma50) {
    action = 'wait'
    const trigger = Math.max(t.sma50, last)
    zone = [r2(trigger), r2(trigger + 0.5 * atr)]
    summary = `Below its 50 day average. Wait until it closes above ${usd(trigger)} before buying.`
  } else if (extended || rating === 'watch') {
    action = 'pullback'
    const lo = Math.max(sma20, last - 2.5 * atr)
    const hi = Math.max(lo, last - atr)
    zone = [r2(lo), r2(hi)]
    summary = extended
      ? `Strong but stretched (RSI ${Math.round(t.rsi14 ?? 0)}). Do not chase: wait for a dip into ${usd(zone[0])} to ${usd(zone[1])}.`
      : `Mixed signals. Only buy on a dip into ${usd(zone[0])} to ${usd(zone[1])}, near the 20 day average.`
  } else {
    action = 'buy-now'
    zone = [r2(last - 0.75 * atr), r2(last + 0.25 * atr)]
    summary = `Trend and signals line up. Buying between ${usd(zone[0])} and ${usd(zone[1])} is in line with the plan.`
  }

  const entry = (zone[0] + zone[1]) / 2
  // Stop just under the recent swing low, but at least 1.5 and at most 3 average moves away.
  let stop = swingLow - 0.5 * atr
  stop = Math.min(stop, entry - 1.5 * atr)
  stop = Math.max(stop, entry - 3 * atr)
  const risk = entry - stop
  const target1 = entry + 2 * risk
  let target2 = entry + 3.5 * risk
  // Use the 52 week high as target 2 when it sits between the targets (natural resistance).
  if (high52 > target1 * 1.01 && high52 < target2) target2 = high52
  const riskPct = risk / entry
  const positionPct = Math.min(MAX_POSITION, ACCOUNT_RISK / riskPct)

  const exitRules = [
    `Stop loss: sell everything if it closes below ${usd(stop)} (${pct(stop / entry - 1)} from entry).`,
    `Target 1 at ${usd(target1)} (${pct(target1 / entry - 1)}): sell half and move your stop up to your entry price.`,
    `Target 2 at ${usd(target2)} (${pct(target2 / entry - 1)}): sell the rest${high52 === target2 ? ', this is the 52 week high' : ''}.`,
    `Trailing exit: after target 1, sell the rest if it closes below the 20 day average (now ${usd(sma20)}).`,
    'Signal exit: sell early if the score falls below 45 or insiders and Congress turn to selling.',
    'Time exit: if target 1 is not reached within about 30 trading days, free up the money.',
  ]

  return {
    action,
    summary,
    entryLow: zone[0],
    entryHigh: zone[1],
    stop: r2(stop),
    target1: r2(target1),
    target2: r2(target2),
    riskPct: Math.round(riskPct * 1000) / 1000,
    rewardRisk: 2,
    positionPct: Math.round(positionPct * 1000) / 1000,
    avgMove: r2(atr),
    holding: '2 to 8 weeks',
    exitRules,
  }
}
