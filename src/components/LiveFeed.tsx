import { useMemo } from 'react'
import { useAppState } from '../state/store'
import { useLivePrices } from '../data/useLivePrices'

/** Streams the stocks that matter right now (Finnhub free tier: 50 symbols): positions, indices, the top of the ranking and what is on screen. */
export function LiveFeed() {
  const state = useAppState()
  const { signals } = state
  const symbols = useMemo(() => {
    const held = [...state.positions.filter((p) => !p.closed).map((p) => p.symbol), ...state.watchlist.map((w) => w.symbol)]
    if (!signals) return held
    const list = [...held, ...signals.market.indices.map((i) => i.symbol), ...signals.recommendations.slice(0, 30).map((r) => r.symbol)]
    if (state.selected) list.unshift(state.selected)
    if (state.view === 'hot' && state.hotSelected) list.unshift(state.hotSelected)
    if (state.view === 'compare') list.unshift(...state.compare)
    return list
  }, [signals, state.selected, state.positions, state.watchlist, state.view, state.hotSelected, state.compare])
  useLivePrices(symbols)
  return null
}
