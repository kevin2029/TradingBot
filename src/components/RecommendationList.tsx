import { Card, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { ActionFilter, PlanAction, Recommendation, SortKey } from '../types'
import { COMPONENT_META, COMPONENT_ORDER, RATING_META, useLive } from '../utils/signals'
import { formatPct, formatPrice } from '../utils/format'
import { Sparkline } from './Sparkline'
import { ACTION_META } from './TradePlanCard'

const ACTIONS: PlanAction[] = ['buy-now', 'pullback', 'wait', 'avoid']
const ACTION_SHORT: Record<PlanAction, string> = { 'buy-now': 'Buy now', pullback: 'Buy dip', wait: 'Breakout', avoid: "Don't buy" }

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'upside', label: 'Upside to target 1' },
  { value: 'change', label: "Today's move" },
  { value: 'risk', label: 'Lowest risk (stop distance)' },
]

function upside(r: Recommendation, price: number) {
  return r.plan ? r.plan.target1 / price - 1 : -Infinity
}

export function RecommendationList() {
  const { signals, filter, sort, selected, quotes } = useAppState()
  const dispatch = useAppDispatch()
  if (!signals) return null

  const all = signals.recommendations
  const counts = Object.fromEntries(ACTIONS.map((a) => [a, all.filter((r) => r.plan?.action === a).length])) as Record<PlanAction, number>
  const livePrice = (r: Recommendation) => quotes[r.symbol]?.price ?? r.price.last
  const dayMove = (r: Recommendation) => {
    const q = quotes[r.symbol]
    if (q?.prevClose) return q.price / q.prevClose - 1
    return r.price.change1d
  }

  const rows = all
    .filter((r) => filter === 'all' || r.plan?.action === filter)
    .slice()
    .sort((a, b) => {
      if (sort === 'upside') return upside(b, livePrice(b)) - upside(a, livePrice(a))
      if (sort === 'change') return dayMove(b) - dayMove(a)
      if (sort === 'risk') return (a.plan?.riskPct ?? 1) - (b.plan?.riskPct ?? 1)
      return b.score - a.score
    })

  return (
    <Card padding={0} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '18px 20px 14px', display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Recommendations</span>
          <span style={{ fontSize: 11, color: 'var(--faint)', ...mono }}>
            {rows.length} OF {all.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Filter by buy type">
          <FilterChip active={filter === 'all'} onClick={() => dispatch({ type: 'SET_FILTER', filter: 'all' })} label="All" count={all.length} />
          {ACTIONS.map((a) => (
            <FilterChip
              key={a}
              active={filter === a}
              onClick={() => {
                const next = (filter === a ? 'all' : a) as ActionFilter
                dispatch({ type: 'SET_FILTER', filter: next })
                // keep the detail panel in sync with what the list shows
                const first = all.find((r) => next === 'all' || r.plan?.action === next)
                if (first && next !== 'all' && all.find((r) => r.symbol === selected)?.plan?.action !== next)
                  dispatch({ type: 'SELECT', symbol: first.symbol })
              }}
              label={ACTION_SHORT[a]}
              count={counts[a]}
              color={ACTION_META[a].color}
            />
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
          Sort by
          <select
            value={sort}
            onChange={(e) => dispatch({ type: 'SET_SORT', sort: e.target.value as SortKey })}
            style={{ flex: 1, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--inset)', color: 'var(--text)', fontSize: 12.5, padding: '0 8px' }}
          >
            {SORTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 760 }}>
        {rows.length === 0 && <div style={{ padding: 24, fontSize: 13, color: 'var(--muted)' }}>No stocks with this buy type right now.</div>}
        {rows.map((r, i) => (
          <Row key={r.symbol} r={r} rank={i + 1} active={r.symbol === selected} onClick={() => dispatch({ type: 'SELECT', symbol: r.symbol })} />
        ))}
      </div>
    </Card>
  )
}

function FilterChip({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count: number; color?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      disabled={count === 0 && !active}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 999,
        border: `1px solid ${active ? color ?? 'var(--text)' : 'var(--border)'}`,
        background: active ? 'var(--surface2)' : 'transparent',
        color: active ? 'var(--text)' : count === 0 ? 'var(--faint)' : 'var(--muted)',
        fontSize: 12,
        fontWeight: 600,
        cursor: count === 0 && !active ? 'default' : 'pointer',
        opacity: count === 0 && !active ? 0.55 : 1,
      }}
    >
      {color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />}
      {label}
      <span style={{ fontSize: 11, color: 'var(--faint)', ...mono }}>{count}</span>
    </button>
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
          {r.plan && (
            <span title={r.plan.summary} style={{ fontSize: 10, fontWeight: 600, color: ACTION_META[r.plan.action].color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...mono }}>
              {ACTION_META[r.plan.action].label}
            </span>
          )}
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
