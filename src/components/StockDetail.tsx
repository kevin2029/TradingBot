import { Card, Chip, Eyebrow, mono } from '../ui/Primitives'
import { useAppState } from '../state/store'
import { COMPONENT_META, COMPONENT_ORDER, RATING_META, useLive } from '../utils/signals'
import { formatPct, formatPrice } from '../utils/format'
import { PriceChart, type ChartLevel } from './PriceChart'
import { TradePlanCard } from './TradePlanCard'
import { ScoreBadge } from './RecommendationList'

export function StockDetail() {
  const { signals, selected } = useAppState()
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
        { price: plan.action === 'wait' ? plan.entryLow : (plan.entryLow + plan.entryHigh) / 2, label: plan.action === 'wait' ? 'BUY ABOVE' : 'ENTRY', color: '--info' },
        { price: plan.stop, label: 'STOP', color: '--down' },
      ]
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
      <Card padding={20}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{rec.name}</span>
              <Chip>{rec.symbol}</Chip>
              {live.live && <Chip style={{ color: 'var(--up)', borderColor: 'var(--up)' }}>LIVE</Chip>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 600, ...mono }}>{formatPrice(live.last)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: up ? 'var(--up)' : 'var(--down)', ...mono }}>{formatPct(live.change)} today</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: meta.color }}>{meta.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {rec.agreeing} of 6 signals positive
              </div>
            </div>
            <ScoreBadge score={rec.score} color={meta.color} size={56} />
          </div>
        </div>
        <PriceChart symbol={rec.symbol} history={p.history} livePrice={live.live ? live.last : undefined} liveTs={live.ts} levels={levels} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginTop: 16 }}>
          <Stat label="50D AVG" value={p.sma50 ? formatPrice(p.sma50) : '—'} />
          <Stat label="200D AVG" value={p.sma200 ? formatPrice(p.sma200) : '—'} />
          <Stat label="RSI 14" value={p.rsi14 != null ? p.rsi14.toFixed(0) : '—'} />
          <Stat label="20D RETURN" value={formatPct(p.ret20, 1)} color={p.ret20 >= 0 ? 'var(--up)' : 'var(--down)'} />
          <Stat label="DAILY VOL" value={`${(p.vol20 * 100).toFixed(1)}%`} />
        </div>
      </Card>

      {plan && <TradePlanCard plan={plan} price={live.last} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
        <Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Signal breakdown</span>
          {COMPONENT_ORDER.map((k) => (
            <SignalBar key={k} label={COMPONENT_META[k].label} hint={COMPONENT_META[k].hint} weight={signals.weights[k]} score={rec.components[k].score} detail={rec.components[k].detail} />
          ))}
        </Card>
        <Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Eyebrow>Why it scores</Eyebrow>
            <List items={rec.reasons} empty="No strong positive signals." color="var(--up)" />
          </div>
          <div>
            <Eyebrow>Risks</Eyebrow>
            <List items={rec.risks} empty="No specific risk flags." color="var(--down)" />
          </div>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint)', letterSpacing: '.08em', ...mono }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, color, ...mono }}>{value}</div>
    </div>
  )
}

function SignalBar({ label, hint, weight, score, detail }: { label: string; hint: string; weight: number; score: number | null; detail: string }) {
  const s = score ?? 0
  const color = score == null ? 'var(--faint)' : s > 0.05 ? 'var(--up)' : s < -0.05 ? 'var(--down)' : 'var(--faint)'
  return (
    <div title={hint} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5 }}>
        <span style={{ fontWeight: 600 }}>
          {label} <span style={{ color: 'var(--faint)', fontWeight: 400, ...mono }}>{Math.round(weight * 100)}%</span>
        </span>
        <span style={{ color, fontWeight: 600, ...mono }}>{score == null ? 'n/a' : `${s > 0 ? '+' : ''}${Math.round(s * 100)}`}</span>
      </div>
      {/* centered bar: left half negative, right half positive */}
      <div style={{ position: 'relative', height: 6, background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 999 }}>
        <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'var(--border2)' }} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            borderRadius: 999,
            background: color,
            left: s >= 0 ? '50%' : `${50 + s * 50}%`,
            width: `${Math.abs(s) * 50}%`,
          }}
        />
      </div>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{detail}</span>
    </div>
  )
}

function List({ items, empty, color }: { items: string[]; empty: string; color: string }) {
  if (items.length === 0) return <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>{empty}</div>
  return (
    <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((t) => (
        <li key={t} style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.45 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 7, flexShrink: 0 }} />
          {t}
        </li>
      ))}
    </ul>
  )
}
