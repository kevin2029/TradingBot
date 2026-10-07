import { Card, Chip, Eyebrow, mono } from '../ui/Primitives'
import { useAppState } from '../state/store'
import type { Benchmark } from '../types'
import { REGIME_META, useLive } from '../utils/signals'
import { formatPct, formatPrice, timeAgo } from '../utils/format'
import { Sparkline } from './Sparkline'

export function MarketPulse() {
  const { signals } = useAppState()
  if (!signals) return null
  const { market } = signals
  const meta = REGIME_META[market.regime]

  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 16 }}>
      <Card padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 10, gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Eyebrow>Market regime</Eyebrow>
          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.soft, borderRadius: 999, padding: '3px 10px', ...mono }}>
            {meta.label}
          </span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)', flex: 1 }}>{market.summary}</div>
        <div style={{ fontSize: 11, color: 'var(--faint)', ...mono }}>
          SIGNALS UPDATED {timeAgo(signals.generatedAt).toUpperCase()}
          {signals.stale ? ' (STALE)' : ''}
        </div>
        <a href={signals.sources.congress.attribution.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5 }}>
          Congress trade data by Bargo
        </a>
      </Card>
      {market.indices.map((b) => (
        <IndexCard key={b.symbol} b={b} />
      ))}
    </section>
  )
}

function IndexCard({ b }: { b: Benchmark }) {
  const { last, change } = useLive(b.symbol, b)
  const up = change >= 0
  const color = up ? 'var(--up)' : 'var(--down)'
  const soft = up ? 'var(--upsoft)' : 'var(--downsoft)'
  return (
    <Card padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{b.name}</span>
        <Chip>{b.symbol}</Chip>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', ...mono }}>{formatPrice(last)}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color, background: soft, borderRadius: 4, padding: '1px 6px', ...mono }}>{formatPct(change)}</span>
        <Sparkline values={b.history.slice(-60).map((h) => h[1])} color={color} softColor={soft} />
      </div>
    </Card>
  )
}
