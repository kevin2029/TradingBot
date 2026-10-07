import type { HotStock, Rating, Recommendation, WatchItem } from '../types'

const RANK: Record<Rating, number> = { avoid: 0, watch: 1, buy: 2, 'strong-buy': 3 }
const NAME: Record<Rating, string> = { avoid: 'Avoid', watch: 'Watch', buy: 'Buy', 'strong-buy': 'Strong buy' }

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

/** Snapshot of a stock at the moment it is starred, so later changes can be shown. */
export function watchItemFor(symbol: string, rec?: Recommendation, hot?: HotStock): WatchItem {
  return {
    symbol,
    addedAt: todayIso(),
    price: rec?.price.last ?? hot?.price.last ?? null,
    score: rec?.score ?? hot?.ranking?.score ?? null,
    rating: rec?.rating ?? hot?.ranking?.rating ?? null,
    action: rec?.plan?.action ?? hot?.ranking?.action ?? null,
  }
}

export type WatchNote = { text: string; tone: 'good' | 'bad' | 'warn' | 'info' }

/** What changed since the stock was starred, most important first. */
export function watchNotes(item: WatchItem, rec: Recommendation | undefined, price: number | null): WatchNote[] {
  const notes: WatchNote[] = []
  if (!rec) {
    notes.push({ text: 'Not in the ranking right now, so no plan', tone: 'info' })
    return notes
  }
  const plan = rec.plan
  if (plan && price != null && !plan.earningsBlock) {
    if ((plan.action === 'buy-now' || plan.action === 'pullback') && price >= plan.entryLow && price <= plan.entryHigh) notes.push({ text: 'In the entry zone now', tone: 'good' })
    if (plan.action === 'wait' && price > plan.entryLow) notes.push({ text: 'Above the breakout level: wait for a daily close', tone: 'info' })
  }
  if (item.rating && item.rating !== rec.rating) {
    const better = RANK[rec.rating] > RANK[item.rating]
    notes.push({ text: `${better ? 'Upgraded' : 'Downgraded'}: ${NAME[item.rating]} to ${NAME[rec.rating]}`, tone: better ? 'good' : 'bad' })
  }
  if (plan?.earnings && plan.earnings.days <= 7) notes.push({ text: `Earnings in ${plan.earnings.days} day${plan.earnings.days === 1 ? '' : 's'}`, tone: 'warn' })
  return notes
}

/** True when a watched stock has something worth a look today. */
export function needsLook(notes: WatchNote[]) {
  return notes.some((n) => n.tone !== 'info')
}
