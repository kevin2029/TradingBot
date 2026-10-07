import { useAppDispatch, useAppState } from '../state/store'
import { RecommendationList } from './RecommendationList'
import { StockDetail } from './StockDetail'
import { Freshness, NeedsSignals, PageHead } from './Page'
import { Card } from '../ui/Primitives'
import { ChevronLeftIcon } from '../ui/Logo'

/** Ranked list next to the selected stock. On narrow screens they are two screens: list, then detail. */
export function StocksPage() {
  return (
    <NeedsSignals>
      <Stocks />
    </NeedsSignals>
  )
}

function Stocks() {
  const { signals, detail, selected } = useAppState()
  const dispatch = useAppDispatch()
  const total = signals!.recommendations.length
  return (
    <main className="page">
      <div className={detail ? 'hide-narrow-detail' : undefined}>
        <PageHead
          title="Stocks"
          sub={
            <>
              {total} stocks ranked by price momentum, insider buying and other public signals.
              <div style={{ marginTop: 4 }}>
                <Freshness />
              </div>
            </>
          }
        />
      </div>
      {total === 0 && (
        <Card padding={22}>
          <div className="t-headline" style={{ marginBottom: 6 }}>
            No stocks could be scored in the last run
          </div>
          <div className="t-sub">Usually the network or the price source was unreachable. Check Data sources in Settings. The dev server retries every 5 minutes.</div>
        </Card>
      )}
      <section className="main-grid" data-route={detail ? 'detail' : 'list'}>
        <div className="list-col sticky-col">
          <RecommendationList />
        </div>
        <div className="detail-col" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {detail && (
            <button
              className="only-narrow"
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'stocks' })}
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', color: 'var(--info)', fontSize: 16, padding: '4px 0', cursor: 'pointer' }}
            >
              <ChevronLeftIcon />
              Stocks
            </button>
          )}
          {selected ? <StockDetail /> : null}
          </div>
        </div>
      </section>
    </main>
  )
}
