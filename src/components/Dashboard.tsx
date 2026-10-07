import { useMemo } from 'react'
import { Card } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { useLivePrices } from '../data/useLivePrices'
import { MarketPulse } from './MarketPulse'
import { RecommendationList } from './RecommendationList'
import { StockDetail } from './StockDetail'
import { SourcesCard } from './SourcesCard'

export function Dashboard() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const { signals } = state

  // Stream the indices, the top of the list and whatever is selected (Finnhub free tier: 50 symbols).
  const symbols = useMemo(() => {
    if (!signals) return []
    const list = [...signals.market.indices.map((i) => i.symbol), ...signals.recommendations.slice(0, 30).map((r) => r.symbol)]
    if (state.selected) list.unshift(state.selected)
    return list
  }, [signals, state.selected])
  useLivePrices(symbols)

  if (!signals) {
    return (
      <main className="page">
        <Card padding={28}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{state.signalsLoading ? 'Loading signals…' : 'No signals available'}</div>
          {state.signalsError && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{state.signalsError}</div>}
        </Card>
      </main>
    )
  }

  return (
    <main className="page">
      <MarketPulse />
      {state.live.status === 'no-key' && (
        <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--infosoft)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
          Showing last close prices. For real-time prices add a free Finnhub key in{' '}
          <a href="#" onClick={(e) => (e.preventDefault(), dispatch({ type: 'SET_VIEW', view: 'settings' }))}>
            Settings
          </a>
          .
        </div>
      )}
      <section className="main-grid">
        <RecommendationList />
        <StockDetail />
      </section>
      <SourcesCard />
    </main>
  )
}
