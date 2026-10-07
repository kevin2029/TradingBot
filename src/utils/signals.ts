import { useAppState } from '../state/store'
import type { ComponentKey, Rating, Regime, Technicals } from '../types'

export const RATING_META: Record<Rating, { label: string; color: string; soft: string }> = {
  'strong-buy': { label: 'Strong buy', color: 'var(--up)', soft: 'var(--upsoft)' },
  buy: { label: 'Buy', color: 'var(--up)', soft: 'var(--upsoft)' },
  watch: { label: 'Watch', color: 'var(--warn)', soft: 'var(--warnsoft)' },
  avoid: { label: 'Avoid', color: 'var(--down)', soft: 'var(--downsoft)' },
}

export const REGIME_META: Record<Regime, { label: string; color: string; soft: string }> = {
  'risk-on': { label: 'RISK ON', color: 'var(--up)', soft: 'var(--upsoft)' },
  neutral: { label: 'NEUTRAL', color: 'var(--warn)', soft: 'var(--warnsoft)' },
  'risk-off': { label: 'RISK OFF', color: 'var(--down)', soft: 'var(--downsoft)' },
}

export const COMPONENT_META: Record<ComponentKey, { label: string; short: string; hint: string }> = {
  technical: { label: 'Chart', short: 'CHT', hint: 'Trend vs 50/200 day averages, 20 day momentum, RSI' },
  congress: { label: 'Congress', short: 'CON', hint: 'Disclosed purchases minus sales by members of Congress, last 90 days' },
  insider: { label: 'Insiders', short: 'INS', hint: 'Open-market Form 4 buys and sells by company insiders, last 90 days' },
  social: { label: 'WSB buzz', short: 'WSB', hint: 'Rank and 24h mention change on r/wallstreetbets' },
  contracts: { label: 'Gov contracts', short: 'GOV', hint: 'Federal contract awards in the last 30 days' },
  lobbying: { label: 'Lobbying', short: 'LOB', hint: 'Lobbying spend disclosed in the last 90 days' },
}

export const COMPONENT_ORDER: ComponentKey[] = ['technical', 'congress', 'insider', 'contracts', 'lobbying', 'social']

/** Live price if streaming, otherwise the last close from the snapshot. */
export function useLive(symbol: string, price: Technicals | null | undefined) {
  const { quotes } = useAppState()
  const q = quotes[symbol]
  const history = price?.history ?? []
  const fallbackPrev = history.length >= 2 ? history[history.length - 2][1] : price?.last
  const last = q?.price ?? price?.last ?? 0
  const prev = q?.prevClose ?? fallbackPrev ?? last
  const change = prev ? last / prev - 1 : 0
  return { last, change, live: !!q, ts: q?.ts }
}
