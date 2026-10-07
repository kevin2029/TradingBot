import { Card, SegmentedControl, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { Recommendation, RatingFilter } from '../types'
import { COMPONENT_META, COMPONENT_ORDER, RATING_META, useLive } from '../utils/signals'
import { formatPct, formatPrice } from '../utils/format'
import { Sparkline } from './Sparkline'

const FILTERS: { value: RatingFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'buys', label: 'Buys' },
  { value: 'watch', label: 'Watch' },
  { value: 'avoid', label: 'Avoid' },
]

export function RecommendationList() {
  const { signals, filter, selected } = useAppState()
  const dispatch = useAppDispatch()
  if (!signals) return null

  const rows = signals.recommendations.filter((r) =>
    filter === 'all' ? true : filter === 'buys' ? r.rating === 'buy' || r.rating === 'strong-buy' : r.rating === filter,
  )

  return (
    <Card padding={0} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '18px 20px 14px', display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Recommendations</span>
          <span style={{ fontSize: 11, color: 'var(--faint)', ...mono }}>{signals.recommendations.length} SCANNED</span>
        </div>
        <SegmentedControl options={FILTERS} value={filter} onChange={(f) => dispatch({ type: 'SET_FILTER', filter: f })} height={28} fontSize={12.5} />
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 760 }}>
        {rows.length === 0 && <div style={{ padding: 24, fontSize: 13, color: 'var(--muted)' }}>No stocks in this group right now.</div>}
        {rows.map((r, i) => (
          <Row key={r.symbol} r={r} rank={i + 1} active={r.symbol === selected} onClick={() => dispatch({ type: 'SELECT', symbol: r.symbol })} />
        ))}
      </div>
    </Card>
  )
}

function Row({ r, rank, active, onClick }: { r: Recommendation; rank: number; active: boolean; onClick: () => void }) {
  const { last, change } = useLive(r.symbol, r.price)
  const meta = RATING_META[r.rating]
  const up = change >= 0
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        borderLeft: `3px solid ${active ? 'var(--info)' : 'transparent'}`,
        background: active ? 'var(--infosoft)' : 'transparent',
        color: 'var(--text)',
        cursor: 'pointer',
        padding: '12px 18px 12px 15px',
        display: 'grid',
        gridTemplateColumns: '22px minmax(0,1fr) auto',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--faint)', ...mono }}>{rank}</span>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, ...mono }}>{r.symbol}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: meta.color, background: meta.soft, borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap', ...mono }}>
            {meta.label.toUpperCase()}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
        <SignalDots r={r} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="hide-sm">
          <Sparkline values={r.price.history.slice(-40).map((h) => h[1])} color={up ? 'var(--up)' : 'var(--down)'} softColor={up ? 'var(--upsoft)' : 'var(--downsoft)'} width={64} height={30} />
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, ...mono }}>{formatPrice(last)}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: up ? 'var(--up)' : 'var(--down)', ...mono }}>{formatPct(change)}</span>
        </div>
        <ScoreBadge score={r.score} color={meta.color} />
      </div>
    </button>
  )
}

export function ScoreBadge({ score, color, size = 40 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeDasharray={`${(score / 100) * c} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.32} fontWeight={700} fill="var(--text)" fontFamily="'IBM Plex Mono', monospace">
        {score}
      </text>
    </svg>
  )
}

function SignalDots({ r }: { r: Recommendation }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {COMPONENT_ORDER.map((k) => {
        const s = r.components[k].score
        const color = s == null ? 'var(--border2)' : s > 0.2 ? 'var(--up)' : s < -0.2 ? 'var(--down)' : 'var(--faint)'
        return (
          <span
            key={k}
            title={`${COMPONENT_META[k].label}: ${r.components[k].detail}`}
            style={{ fontSize: 9.5, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 3, padding: '0 4px', lineHeight: '14px', ...mono }}
          >
            {COMPONENT_META[k].short}
          </span>
        )
      })}
    </div>
  )
}
