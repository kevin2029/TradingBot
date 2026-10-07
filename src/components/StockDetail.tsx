import { Card, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { StarButton } from './StarButton'
import { ColumnsIcon } from '../ui/Logo'
import { COMPONENT_META, COMPONENT_ORDER, RATING_META, useLive } from '../utils/signals'
import { formatPct, formatPrice, prettyName } from '../utils/format'
import { PriceChart, type ChartLevel } from './PriceChart'
import { TradePlanCard } from './TradePlanCard'
import { ScoreBadge } from './RecommendationList'

export function StockDetail() {
  const { signals, selected, compare } = useAppState()
  const dispatch = useAppDispatch()
  const rec = signals?.recommendations.find((r) => r.symbol === selected)
  const live = useLive(rec?.symbol ?? '', rec?.price)
  if (!signals || !rec) return null

  const meta = RATING_META[rec.rating]
  const up = live.change >= 0
  const p = rec.price
  const plan = rec.plan
  const levels: ChartLevel[] = plan
    ? [
        { price: plan.target2, label: 'T2', color: '--up' },
        { price: plan.target1, label: 'T1', color: '--up' },
        { price: plan.action === 'wait' ? plan.entryLow : (plan.entryLow + plan.entryHigh) / 2, label: plan.action === 'wait' ? 'Buy above' : 'Entry', color: '--info' },
        { price: plan.stop, label: 'Stop', color: '--down' },
      ]
    : []
  const pc = (v: number | null | undefined, dp = 1) => (v == null ? '—' : formatPct(v, dp))
  const tone = (v: number | null | undefined) => (v == null ? undefined : v >= 0 ? 'var(--up)' : 'var(--down)')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
      {/* hero: what it is, what it costs, what the signals say */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', padding: '4px 4px 0' }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-caption" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.02em' }}>
            {rec.symbol}
            {rec.sector ? ` · ${rec.sector}` : ''}
            {live.live && <span style={{ color: 'var(--up)' }}> · Live</span>}
          </div>
          <h2 className="t-display" style={{ margin: '2px 0 0', fontSize: 30 }}>
            {prettyName(rec.name)}
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.02em', ...mono }}>{formatPrice(live.last)}</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: up ? 'var(--up)' : 'var(--down)', ...mono }}>{formatPct(live.change)}</span>
            <span className="t-caption" style={{ fontSize: 14 }}>
              today
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <StarButton symbol={rec.symbol} />
            <button
              className="tap"
              title="Open side by side with other stocks"
              onClick={() => {
                // nothing to compare against yet: pair it with the best other score
                const base = compare.length ? compare : signals.recommendations.filter((r) => r.symbol !== rec.symbol).slice(0, 1).map((r) => r.symbol)
                dispatch({ type: 'SET_COMPARE', symbols: base.includes(rec.symbol) ? base : [...base.slice(-2), rec.symbol] })
                dispatch({ type: 'SET_VIEW', view: 'compare' })
              }}
              style={{ height: 34, padding: '0 14px 0 10px', borderRadius: 999, border: 'none', background: 'var(--seg-track)', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              <span style={{ display: 'grid', transform: 'scale(.82)' }}>
                <ColumnsIcon />
              </span>
              Compare
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: '-.015em', color: meta.color }}>{meta.label}</div>
            <div className="t-caption" style={{ fontSize: 13 }}>
              {rec.agreeing} of 6 signals agree
            </div>
          </div>
          <ScoreBadge score={rec.score} color={meta.color} size={64} />
        </div>
      </div>

      <Card padding={20}>
        <PriceChart symbol={rec.symbol} history={p.history} livePrice={live.live ? live.last : undefined} liveTs={live.ts} levels={levels} intraday={signals.intraday?.[rec.symbol]} />
        {/* key numbers as a quiet two-column table, like a stocks app */}
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', columnGap: 28, margin: '18px 0 0' }}>
          <Fact label="12-month momentum" value={pc(p.mom12_1, 0)} color={tone(p.mom12_1)} hint="Return from 12 months to 1 month ago" />
          <Fact label="From 52-week high" value={pc(p.high52prox != null ? p.high52prox - 1 : null)} />
          <Fact label="vs S&P 500, 3 months" value={pc(p.rs63)} color={tone(p.rs63)} />
          <Fact label="1 month" value={pc(p.ret20)} color={tone(p.ret20)} />
          <Fact label="50-day average" value={p.sma50 ? formatPrice(p.sma50) : '—'} />
          <Fact label="200-day average" value={p.sma200 ? formatPrice(p.sma200) : '—'} />
          <Fact label="RSI (14 days)" value={p.rsi14 != null ? p.rsi14.toFixed(0) : '—'} hint="Above 70 is stretched, below 30 oversold" />
          <Fact label="Daily swing" value={p.atr14 && p.last ? `${((p.atr14 / p.last) * 100).toFixed(1)}%` : `${(p.vol20 * 100).toFixed(1)}%`} hint="Average true range as a share of the price" />
        </dl>
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'glossary' })} style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, color: 'var(--info)', fontSize: 13.5, cursor: 'pointer' }}>
          What do these numbers mean?
        </button>
      </Card>

      {plan && <TradePlanCard plan={plan} price={live.last} rec={rec} />}

      <div className="grid-2" style={{ gap: 20 }}>
        <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="t-headline">Why it scores</div>
            <List items={rec.reasons} empty="No strong positive signals." color="var(--up)" />
          </div>
          <div>
            <div className="t-headline">Risks</div>
            <List items={rec.risks} empty="No specific risk flags." color="var(--down)" />
          </div>
        </Card>
        <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="t-headline">Signals</div>
            <div className="t-caption" style={{ fontSize: 13, marginTop: 2 }}>
              Each from −100 to +100, weighted into the score
            </div>
          </div>
          {COMPONENT_ORDER.map((k) => (
            <SignalBar key={k} label={COMPONENT_META[k].label} hint={COMPONENT_META[k].hint} weight={signals.weights[k]} score={rec.components[k].score} detail={rec.components[k].detail} />
          ))}
        </Card>
      </div>
    </div>
  )
}

function Fact({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div title={hint} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '10px 0', borderTop: '1px solid var(--hairline)' }}>
      <dt style={{ fontSize: 14, color: 'var(--muted)' }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 15, fontWeight: 600, color, ...mono }}>{value}</dd>
    </div>
  )
}

function SignalBar({ label, hint, weight, score, detail }: { label: string; hint: string; weight: number; score: number | null; detail: string }) {
  const s = score ?? 0
  const color = score == null ? 'var(--faint)' : s > 0.05 ? 'var(--up)' : s < -0.05 ? 'var(--down)' : 'var(--faint)'
  return (
    <div title={hint} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
        <span style={{ fontWeight: 600 }}>
          {label} <span style={{ color: 'var(--faint)', fontWeight: 400, ...mono }}>{Math.round(weight * 100)}%</span>
        </span>
        <span style={{ color, fontWeight: 600, ...mono }}>{score == null ? 'No data' : `${s > 0 ? '+' : ''}${Math.round(s * 100)}`}</span>
      </div>
      {/* centered bar: left half negative, right half positive */}
      <div style={{ position: 'relative', height: 4, background: 'var(--seg-track)', borderRadius: 999 }}>
        <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1.5, borderRadius: 1, background: 'var(--border2)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 999, background: color, left: s >= 0 ? '50%' : `${50 + s * 50}%`, width: `${Math.abs(s) * 50}%` }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>{detail}</span>
    </div>
  )
}

function List({ items, empty, color }: { items: string[]; empty: string; color: string }) {
  if (items.length === 0) return <div className="t-sub" style={{ marginTop: 8 }}>{empty}</div>
  return (
    <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((t) => (
        <li key={t} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.45 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 8, flexShrink: 0 }} />
          {t}
        </li>
      ))}
    </ul>
  )
}
