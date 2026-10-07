import { Card } from '../ui/Primitives'
import { useAppState } from '../state/store'
import { NeedsSignals, PageHead } from './Page'
import { PerformanceCard } from './PerformanceCard'

/** How the rules did in the past (backtest) and how the live picks are doing (track record). */
export function PerformancePage() {
  return (
    <NeedsSignals>
      <Performance />
    </NeedsSignals>
  )
}

function Performance() {
  const { signals } = useAppState()
  const has = signals?.backtest || signals?.track
  return (
    <main className="page">
      <PageHead title="Performance" sub="Would the rules have worked, and are they working now? The backtest replays the plan on two years of prices; the track record follows every Buy pick since it was made." />
      {has ? (
        <PerformanceCard />
      ) : (
        <Card padding={24}>
          <div className="t-sub">No backtest or track record in this data file yet. They appear after the next data run.</div>
        </Card>
      )}
    </main>
  )
}
