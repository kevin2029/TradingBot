import type { Position, Recommendation } from '../types'
import { isTradingDay } from './marketClock'

export type PositionStatusKey = 'stop' | 'target2' | 'target1' | 'weak' | 'on-track' | 'below-entry' | 'no-price' | 'closed'

export interface PositionView {
  position: Position
  price: number | null
  /** unrealised (open) or realised (closed) return on the buy price */
  pnlPct: number | null
  /** in dollars, only when shares are known */
  pnlUsd: number | null
  /** current value of the shares still held */
  value: number | null
  /** calendar days */
  daysHeld: number
  /** NYSE trading days since the buy */
  tradingDays: number
  /** active stop: plan stop, break-even after half, or the trailing stop */
  stop: number | null
  stopKind: 'initial' | 'break-even' | 'trailing' | null
  sector: string | null
  /** dollars lost if the active stop is hit from here (only with shares) */
  riskUsd: number | null
  status: { key: PositionStatusKey; label: string; advice: string; color: string }
  /** extra heads-ups, e.g. upcoming earnings */
  notes: string[]
  rec: Recommendation | undefined
}

const DAY = 86400000
const TIME_STOP_DAYS = 30
export const MAX_OPEN_RISK = 0.06 // all stops together: at most 6% of the account
export const MAX_SECTOR_SHARE = 0.3 // at most 30% of the account in one industry
export const MAX_SECTOR_POSITIONS = 2

export function daysBetween(fromIso: string, to = Date.now()) {
  return Math.max(0, Math.floor((to - new Date(fromIso).getTime()) / DAY))
}

/** NYSE trading days after `fromIso` up to and including `to`. */
export function tradingDaysBetween(fromIso: string, to = Date.now()) {
  const start = new Date(`${fromIso}T12:00:00Z`)
  let n = 0
  for (let d = new Date(start.getTime() + DAY); d.getTime() <= to && n < 400; d = new Date(d.getTime() + DAY)) {
    if (isTradingDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())) n++
  }
  return n
}

/** Highest daily close since the buy date (plus today's price), from the recommendation's history. */
function highestSince(rec: Recommendation | undefined, fromIso: string, price: number | null) {
  const since = new Date(`${fromIso}T00:00:00Z`).getTime() / 1000
  let hi = price ?? 0
  for (const [t, c] of rec?.price.history ?? []) if (t >= since) hi = Math.max(hi, c)
  return hi || null
}

export function evaluatePosition(position: Position, livePrice: number | undefined, rec: Recommendation | undefined): PositionView {
  const closed = position.closed
  const price = closed ? closed.price : livePrice ?? rec?.price.last ?? null
  const plan = position.plan
  const daysHeld = daysBetween(position.boughtAt, closed ? new Date(closed.at).getTime() : Date.now())
  const tradingDays = tradingDaysBetween(position.boughtAt, closed ? new Date(closed.at).getTime() : Date.now())
  const sector = position.sector ?? rec?.sector ?? null

  // Active stop: initial plan stop; after selling half at least break-even, then a trailing stop
  // (3 ATR below the highest close since buying) once that is higher.
  let stop: number | null = null
  let stopKind: PositionView['stopKind'] = null
  if (plan) {
    stop = plan.stop
    stopKind = 'initial'
    if (position.halfSold) {
      stop = Math.max(plan.stop, position.buyPrice)
      stopKind = 'break-even'
      const trailDist = plan.trailDistance ?? (rec?.plan?.avgMove ? 3 * rec.plan.avgMove : null)
      const hi = highestSince(rec, position.boughtAt, price)
      if (trailDist && hi && hi - trailDist > stop) {
        stop = Math.round((hi - trailDist) * 100) / 100
        stopKind = 'trailing'
      }
    }
  }

  // Blend in the half that was sold at target 1.
  let pnlPct: number | null = null
  if (price != null) {
    const restRet = price / position.buyPrice - 1
    pnlPct = position.halfSold ? 0.5 * (position.halfSold.price / position.buyPrice - 1) + 0.5 * restRet : restRet
  }
  const pnlUsd = pnlPct != null && position.shares ? pnlPct * position.buyPrice * position.shares : null
  const remainingShares = position.shares ? (position.halfSold ? position.shares / 2 : position.shares) : null
  const value = price != null && remainingShares != null && !closed ? price * remainingShares : null
  const riskUsd = !closed && price != null && stop != null && remainingShares != null ? Math.max(0, price - stop) * remainingShares : null

  const notes: string[] = []
  const e = rec?.plan?.earnings
  if (!closed && e && e.days <= 14) {
    notes.push(`Earnings on ${e.date} (in ${e.days} days): the price can gap past your stop. Consider selling half before the report.`)
  }
  if (!closed && rec?.plan?.riskOff) notes.push('The market is in a downtrend: be quicker to take profits.')

  let status: PositionView['status']
  if (closed) {
    status = { key: 'closed', label: 'Closed', advice: `Sold at $${closed.price.toFixed(2)} on ${closed.at}.`, color: 'var(--muted)' }
  } else if (price == null) {
    status = { key: 'no-price', label: 'No price', advice: 'Add a Finnhub key in Settings to track stocks that are no longer in the recommendations.', color: 'var(--faint)' }
  } else if (stop != null && price <= stop) {
    const what = stopKind === 'trailing' ? 'Trailing stop hit' : stopKind === 'break-even' ? 'Break-even stop hit' : 'Stop hit'
    status = {
      key: 'stop',
      label: what,
      advice: `Price is at or below the stop ($${stop.toFixed(2)}). Sell${position.halfSold ? ' the rest' : ''} on a close below it, or at the open if it gaps below.`,
      color: stopKind === 'initial' ? 'var(--down)' : 'var(--warn)',
    }
  } else if (plan && price >= plan.target1 && !position.halfSold) {
    status = {
      key: 'target1',
      label: 'Target 1 reached',
      advice: `Above $${plan.target1.toFixed(2)}: sell half and mark it below. The stop then moves up to your buy price and trails the rest.`,
      color: 'var(--up)',
    }
  } else if (plan && price >= plan.target2 && position.halfSold) {
    status = {
      key: 'target2',
      label: 'Reference target reached',
      advice: `Above $${plan.target2.toFixed(2)}: take more profit or let the trailing stop ($${stop?.toFixed(2)}) decide.`,
      color: 'var(--up)',
    }
  } else if (rec && (rec.score < 45 || rec.plan?.action === 'avoid')) {
    status = { key: 'weak', label: 'Signals weakened', advice: `Score is now ${rec.score} (${rec.rating.replace('-', ' ')}). The plan says consider selling early.`, color: 'var(--warn)' }
  } else if (tradingDays > TIME_STOP_DAYS && !position.halfSold) {
    status = { key: 'weak', label: 'Time stop', advice: `${tradingDays} trading days without reaching target 1. Consider freeing up the money.`, color: 'var(--warn)' }
  } else if (price < position.buyPrice) {
    status = { key: 'below-entry', label: 'Below buy price', advice: stop ? `Hold while above the stop ($${stop.toFixed(2)}).` : 'Hold, no stop recorded.', color: 'var(--warn)' }
  } else {
    status = {
      key: 'on-track',
      label: stopKind === 'trailing' ? 'Running, trailing stop' : position.halfSold ? 'Running, stop at break-even' : 'On track',
      advice: plan
        ? position.halfSold
          ? `Let it run. Sell the rest on a close below $${stop?.toFixed(2)}.`
          : `Next: target 1 at $${plan.target1.toFixed(2)}. Day ${tradingDays} of ${TIME_STOP_DAYS}.`
        : 'Hold.',
      color: 'var(--up)',
    }
  }

  return { position, price, pnlPct, pnlUsd, value, daysHeld, tradingDays, stop, stopKind, sector, riskUsd, status, notes, rec }
}

export interface PortfolioRisk {
  /** sum of dollars at risk to the active stops (positions with shares) */
  openRiskUsd: number
  openRiskPct: number | null
  invested: number
  bySector: { sector: string; positions: number; value: number; share: number | null }[]
  warnings: string[]
  /** positions without shares, so they can't be counted */
  unsized: number
}

export function portfolioRisk(views: PositionView[], accountSize: number | null): PortfolioRisk {
  const open = views.filter((v) => !v.position.closed)
  const openRiskUsd = open.reduce((a, v) => a + (v.riskUsd ?? 0), 0)
  const invested = open.reduce((a, v) => a + (v.value ?? 0), 0)
  const map = new Map<string, { positions: number; value: number }>()
  for (const v of open) {
    const k = v.sector ?? 'Unknown'
    const cur = map.get(k) ?? { positions: 0, value: 0 }
    cur.positions++
    cur.value += v.value ?? 0
    map.set(k, cur)
  }
  const bySector = [...map.entries()]
    .map(([sector, x]) => ({ sector, ...x, share: accountSize ? x.value / accountSize : invested ? x.value / invested : null }))
    .sort((a, b) => b.value - a.value || b.positions - a.positions)
  const warnings: string[] = []
  const openRiskPct = accountSize ? openRiskUsd / accountSize : null
  if (openRiskPct != null && openRiskPct > MAX_OPEN_RISK)
    warnings.push(`All your stops together risk ${(openRiskPct * 100).toFixed(1)}% of the account (limit ${MAX_OPEN_RISK * 100}%). Tighten stops or take profit before adding new positions.`)
  for (const s of bySector) {
    if (s.sector === 'Unknown') continue
    if (s.positions > MAX_SECTOR_POSITIONS) warnings.push(`${s.positions} positions in ${s.sector}: that is one bet. Keep it to ${MAX_SECTOR_POSITIONS}.`)
    if (accountSize && s.share != null && s.share > MAX_SECTOR_SHARE)
      warnings.push(`${(s.share * 100).toFixed(0)}% of the account in ${s.sector} (limit ${MAX_SECTOR_SHARE * 100}%).`)
  }
  return { openRiskUsd, openRiskPct, invested, bySector, warnings, unsized: open.filter((v) => !v.position.shares).length }
}

export function newPositionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
