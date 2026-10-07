import { useState } from 'react'
import { Card, inputStyle, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { ActionFilter, PlanAction, Recommendation, SortKey } from '../types'
import { RATING_META, useLive } from '../utils/signals'
import { formatPct, formatPrice, prettyName } from '../utils/format'
import { Sparkline } from './Sparkline'
import { ACTION_META, EARNINGS_META } from './TradePlanCard'

const ACTIONS: PlanAction[] = ['buy-now', 'pullback', 'wait', 'avoid']
const ACTION_SHORT: Record<PlanAction, string> = { 'buy-now': 'Buy now', pullback: 'Buy on a dip', wait: 'Breakout', avoid: "Don't buy" }

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'upside', label: 'Upside to target 1' },
  { value: 'change', label: "Today's move" },
  { value: 'risk', label: 'Lowest risk' },
  { value: 'volatile', label: 'Most volatile' },
]

/** Typical daily swing: average true range as a share of the price. */
function swing(r: Recommendation) {
  const p = r.price
  return p.atr14 && p.last ? p.atr14 / p.last : p.vol20 ?? 0
}

function upside(r: Recommendation, price: number) {
  return r.plan ? r.plan.target1 / price - 1 : -Infinity
}

export function RecommendationList() {
  const { signals, filter, sort, selected, quotes } = useAppState()
  const dispatch = useAppDispatch()
  const [query, setQuery] = useState('')
  if (!signals) return null

  const all = signals.recommendations
  const counts = Object.fromEntries(ACTIONS.map((a) => [a, all.filter((r) => r.plan?.action === a).length])) as Record<PlanAction, number>
  const livePrice = (r: Recommendation) => quotes[r.symbol]?.price ?? r.price.last
  const dayMove = (r: Recommendation) => {
    const q = quotes[r.symbol]
    if (q?.prevClose) return q.price / q.prevClose - 1
    return r.price.change1d
  }
  const q = query.trim().toLowerCase()

  const rows = all
    .filter((r) => filter === 'all' || r.plan?.action === filter)
    .filter((r) => !q || r.symbol.toLowerCase().startsWith(q) || r.name.toLowerCase().includes(q))
    .slice()
    .sort((a, b) => {
      if (sort === 'upside') return upside(b, livePrice(b)) - upside(a, livePrice(a))
      if (sort === 'change') return dayMove(b) - dayMove(a)
      if (sort === 'risk') return (a.plan?.riskPct ?? 1) - (b.plan?.riskPct ?? 1)
      if (sort === 'volatile') return swing(b) - swing(a)
      return b.score - a.score
    })

  return (
    <Card padding={0} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ticker or name"
          aria-label="Search stocks"
          style={{ ...inputStyle, height: 38, border: 'none', background: 'var(--seg-track)', borderRadius: 10 }}
        />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -16px', padding: '0 16px' }} role="group" aria-label="Filter by buy type">
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
                if (first && next !== 'all' && all.find((r) => r.symbol === selected)?.plan?.action !== next) dispatch({ type: 'SELECT', symbol: first.symbol })
              }}
              label={ACTION_SHORT[a]}
              count={counts[a]}
              dot={ACTION_META[a].color}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span className="t-caption" style={{ fontSize: 13 }}>
            {rows.length === all.length ? `${all.length} stocks` : `${rows.length} of ${all.length}`}
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            Sort
            <select
              value={sort}
              onChange={(e) => dispatch({ type: 'SET_SORT', sort: e.target.value as SortKey })}
              style={{ height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--info)', fontSize: 13, fontWeight: 500, padding: '0 6px', cursor: 'pointer', backgroundPosition: 'calc(100% - 12px) 50%, calc(100% - 7px) 50%' }}
            >
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="list-scroll" style={{ overflowY: 'auto', maxHeight: 'min(760px, calc(100vh - 290px))', padding: '0 8px 8px' }}>
        {rows.length === 0 && <div className="t-sub" style={{ padding: '20px 12px' }}>{q ? `Nothing matches "${query}".` : 'No stocks with this buy type right now.'}</div>}
        {rows.map((r, i) => (
          <Row key={r.symbol} r={r} last={i === rows.length - 1} active={r.symbol === selected} onClick={() => dispatch({ type: 'OPEN_STOCK', symbol: r.symbol })} />
        ))}
      </div>
    </Card>
  )
}

function FilterChip({ active, onClick, label, count, dot }: { active: boolean; onClick: () => void; label: string; count: number; dot?: string }) {
  const empty = count === 0 && !active
  return (
    <button
      className="tap"
      onClick={onClick}
      aria-pressed={active}
      disabled={empty}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 30,
        padding: '0 12px',
        borderRadius: 999,
        border: 'none',
        background: active ? 'var(--text)' : 'var(--seg-track)',
        color: active ? 'var(--bg)' : 'var(--text)',
        fontSize: 13,
        fontWeight: 500,
        cursor: empty ? 'default' : 'pointer',
        opacity: empty ? 0.4 : 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {dot && !active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
      {label}
      <span style={{ opacity: 0.6, ...mono }}>{count}</span>
    </button>
  )
}

/** Apple Stocks style change badge: a colored capsule with the day move. */
export function ChangeBadge({ change, width = 76 }: { change: number; width?: number }) {
  const up = change >= 0
  return (
    <span style={{ display: 'inline-block', minWidth: width, textAlign: 'right', padding: '4px 8px', borderRadius: 7, background: up ? 'var(--up)' : 'var(--down)', color: up ? 'var(--on-up)' : 'var(--on-down)', fontSize: 13.5, fontWeight: 600, ...mono }}>
      {formatPct(change)}
    </span>
  )
}

function Row({ r, active, last, onClick }: { r: Recommendation; active: boolean; last: boolean; onClick: () => void }) {
  const live = useLive(r.symbol, r.price)
  const st = useAppState()
  const holding = st.positions.some((p) => p.symbol === r.symbol && !p.closed)
  const watching = st.watchlist.some((w) => w.symbol === r.symbol)
  const meta = RATING_META[r.rating]
  const act = r.plan ? (r.plan.earningsBlock ? EARNINGS_META : ACTION_META[r.plan.action]) : null
  const up = live.change >= 0
  const extras = [holding && 'Holding', watching && 'Watching', r.newListing && 'New listing', r.plan?.earnings && r.plan.earnings.days <= 7 && `Earnings in ${r.plan.earnings.days}d`].filter(Boolean)
  return (
    <button
      className="tap row"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      style={{
        width: '100%',
        textAlign: 'left',
        border: 'none',
        borderRadius: 12,
        background: active ? 'var(--infosoft)' : 'transparent',
        color: 'var(--text)',
        cursor: 'pointer',
        padding: '11px 10px',
        display: 'grid',
        gridTemplateColumns: '38px minmax(0,1fr) auto',
        gap: 12,
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <ScoreBadge score={r.score} color={meta.color} size={38} />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-.01em' }}>{r.symbol}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prettyName(r.name)}</span>
        <span style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {act && <span style={{ color: act.color, fontWeight: 500 }}>{act.label}</span>}
          {extras.length > 0 && <span style={{ color: 'var(--faint)' }}> · {extras.join(' · ')}</span>}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="hide-sm">
          <Sparkline values={r.price.history.slice(-40).map((h) => h[1])} color={up ? 'var(--up)' : 'var(--down)'} softColor="transparent" width={52} height={26} />
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 500, ...mono }}>{formatPrice(live.last)}</span>
          <ChangeBadge change={live.change} width={68} />
        </div>
      </div>
      {!last && !active && <span aria-hidden style={{ position: 'absolute', left: 60, right: 10, bottom: 0, height: 1, background: 'var(--hairline)' }} />}
    </button>
  )
}

export function ScoreBadge({ score, color, size = 40 }: { score: number; color: string; size?: number }) {
  const stroke = size >= 50 ? 4 : 3
  const r = size / 2 - stroke
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score} of 100`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--seg-track)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${(score / 100) * c} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.34} fontWeight={600} fill="var(--text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {score}
      </text>
    </svg>
  )
}
