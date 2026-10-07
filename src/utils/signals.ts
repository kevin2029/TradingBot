import { useAppState } from '../state/store'
import type { ComponentKey, Rating, Regime, Technicals } from '../types'

export const RATING_META: Record<Rating, { label: string; color: string; soft: string }> = {
  'strong-buy': { label: 'Strong buy', color: 'var(--up)', soft: 'var(--upsoft)' },
  buy: { label: 'Buy', color: 'var(--up)', soft: 'var(--upsoft)' },
  watch: { label: 'Watch', color: 'var(--warn)', soft: 'var(--warnsoft)' },
  avoid: { label: 'Avoid', color: 'var(--down)', soft: 'var(--downsoft)' },
}

export const REGIME_META: Record<Regime, { label: string; color: string; soft: string }> = {
  'risk-on': { label: 'Risk on', color: 'var(--up)', soft: 'var(--upsoft)' },
  neutral: { label: 'Neutral', color: 'var(--warn)', soft: 'var(--warnsoft)' },
  'risk-off': { label: 'Risk off', color: 'var(--down)', soft: 'var(--downsoft)' },
}

export const COMPONENT_META: Record<ComponentKey, { label: string; short: string; hint: string }> = {
  technical: { label: 'Chart', short: 'CHT', hint: '12 month momentum (skipping the last month) and closeness to the 52 week high, both ranked against all stocks, plus the 200 day trend' },
  congress: { label: 'Congress', short: 'CON', hint: 'Disclosed trades by members of Congress. Party leaders count fully, other members only a little: studies find only leaders beat the market' },
  insider: { label: 'Insiders', short: 'INS', hint: 'Open-market Form 4 trades. Unusual (opportunistic) buys count most, routine yearly trades are ignored, several buyers at once add a bonus' },
  social: { label: 'WSB buzz', short: 'WSB', hint: 'Only a risk: heavy hype on r/wallstreetbets tends to come before weaker returns, so it can lower a score but never raise it' },
  contracts: { label: 'Gov contracts', short: 'GOV', hint: 'Federal contract awards in the last 30 days, relative to the size of the company' },
  lobbying: { label: 'Lobbying', short: 'LOB', hint: 'Change in lobbying spend vs the same period last year: a rising budget says more than a big one' },
}

export const COMPONENT_ORDER: ComponentKey[] = ['technical', 'congress', 'insider', 'contracts', 'lobbying', 'social']

/** Live price if streaming, otherwise the last close from the snapshot. */
export function useLive(symbol: string, price: Pick<Technicals, 'last' | 'history'> | null | undefined) {
  const { quotes } = useAppState()
  const q = quotes[symbol]
  const history = price?.history ?? []
  const fallbackPrev = history.length >= 2 ? history[history.length - 2][1] : price?.last
  const last = q?.price ?? price?.last ?? 0
  const prev = q?.prevClose ?? fallbackPrev ?? last
  const change = prev ? last / prev - 1 : 0
  return { last, change, live: !!q, ts: q?.ts }
}
