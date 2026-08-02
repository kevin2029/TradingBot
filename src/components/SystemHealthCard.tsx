import { Card, Eyebrow, StatusDot, mono } from '../ui/Primitives'
import { useAppState } from '../state/store'
import { profitFactor, winRate } from '../state/selectors'

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <StatusDot color={color} />
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color, marginLeft: 'auto', ...mono }}>{value}</span>
    </div>
  )
}

export function SystemHealthCard() {
  const state = useAppState()
  const latencyColor = state.latency > 55 ? 'var(--warn)' : 'var(--up)'
  const strategyColor = state.botOn ? 'var(--info)' : 'var(--faint)'

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <Eyebrow>System health</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row label="Exchange API" value="ONLINE" color="var(--up)" />
        <Row label="Market data feed" value="STREAMING" color="var(--up)" />
        <Row label="Order latency" value={`${Math.round(state.latency)} ms`} color={latencyColor} />
        <Row label="Strategy engine" value={state.botOn ? 'EVALUATING' : 'PAUSED'} color={strategyColor} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderTop: '1px solid var(--border)',
          paddingTop: 12,
          marginTop: 'auto',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Win rate</div>
          <div style={{ fontSize: 18, fontWeight: 600, ...mono }}>{winRate(state).toFixed(0)}%</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Profit factor</div>
          <div style={{ fontSize: 18, fontWeight: 600, ...mono }}>{profitFactor(state).toFixed(2)}</div>
        </div>
      </div>
    </Card>
  )
}
