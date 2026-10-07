import { useMemo } from 'react'
import { Card } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { useLivePrices } from '../data/useLivePrices'
import { MarketPulse } from './MarketPulse'
import { RecommendationList } from './RecommendationList'
import { StockDetail } from './StockDetail'
import { SourcesCard } from './SourcesCard'
import { MISSING } from '../data/useSignals'

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
          {state.signalsLoading ? (
            <div style={{ fontSize: 15, fontWeight: 700 }}>Loading signals…</div>
          ) : state.signalsError === MISSING ? (
            <NoDataYet />
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Could not load signals</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{state.signalsError}</div>
            </>
          )}
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
      {signals.recommendations.length === 0 && (
        <Card padding={22}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No stocks could be scored in the last run</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            Usually the network or the price source was unreachable. Check the Data sources card below. The dev server retries every 5 minutes.
          </div>
        </Card>
      )}
      <section className="main-grid">
        <RecommendationList />
        <StockDetail />
      </section>
      <SourcesCard />
    </main>
  )
}

function NoDataYet() {
  const code = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{import.meta.env.DEV ? 'Fetching market data…' : 'No signals yet'}</div>
      {import.meta.env.DEV ? (
        <>
          <div>The dev server is fetching the public data and scoring stocks. The first run takes about a minute, this page fills in automatically.</div>
          <div>
            Follow progress in the terminal running <span style={code}>npm run dev</span> (lines starting with <span style={code}>[signals]</span>).
          </div>
        </>
      ) : (
        <div>The data appears after the first scheduled GitHub Actions run.</div>
      )}
    </div>
  )
}
