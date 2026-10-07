import { useState, type ReactNode } from 'react'
import { Card, SegmentedControl, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { Recommendation } from '../types'
import { COMPONENT_META, COMPONENT_ORDER, RATING_META, useLive } from '../utils/signals'
import { formatPct, formatPrice, prettyName } from '../utils/format'
import { ACTION_META, EARNINGS_META } from './TradePlanCard'
import { NeedsSignals, PageHead } from './Page'

const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)']
type Span = '1M' | '3M' | '6M' | '1Y'
const DAYS: Record<Span, number> = { '1M': 21, '3M': 63, '6M': 126, '1Y': 252 }

export function ComparePage() {
  return (
    <NeedsSignals>
      <Compare />
    </NeedsSignals>
  )
}

function Compare() {
  const { signals, compare } = useAppState()
  const dispatch = useAppDispatch()
  const [span, setSpan] = useState<Span>('3M')
  const recs = signals!.recommendations
  const byScore = recs.slice().sort((a, b) => b.score - a.score)
  // nothing picked yet: start with the two best scores
  const picked = (compare.length ? compare : byScore.slice(0, 2).map((r) => r.symbol)).map((s) => recs.find((r) => r.symbol === s)).filter((r): r is Recommendation => !!r)
  const set = (symbols: string[]) => dispatch({ type: 'SET_COMPARE', symbols })
  const syms = picked.map((r) => r.symbol)

  return (
    <main className="page">
      <PageHead title="Compare" sub="Up to three stocks side by side: how they moved, how they score and what the plan says. Handy when two ideas look alike." />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {picked.map((r, i) => (
          <label key={r.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 6px 0 14px', borderRadius: 999, background: 'var(--surface)', boxShadow: 'var(--shadow), 0 0 0 1px var(--hairline)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i] }} />
            <select
              value={r.symbol}
              aria-label={`Stock ${i + 1}`}
              onChange={(e) => set(syms.map((s, j) => (j === i ? e.target.value : s)))}
              style={{ height: 32, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 15, fontWeight: 600, cursor: 'pointer', backgroundPosition: 'calc(100% - 12px) 50%, calc(100% - 7px) 50%' }}
            >
              {byScore.map((o) => (
                <option key={o.symbol} value={o.symbol} disabled={o.symbol !== r.symbol && syms.includes(o.symbol)}>
                  {o.symbol} · {o.score}
                </option>
              ))}
            </select>
            {picked.length > 1 && (
              <button aria-label={`Remove ${r.symbol}`} onClick={() => set(syms.filter((s) => s !== r.symbol))} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--seg-track)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>
                ×
              </button>
            )}
          </label>
        ))}
        {picked.length < 3 && (
          <button
            className="tap"
            onClick={() => set([...syms, byScore.find((r) => !syms.includes(r.symbol))!.symbol])}
            style={{ height: 40, padding: '0 16px', borderRadius: 999, border: 'none', background: 'var(--seg-track)', color: 'var(--info)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            + Add a stock
          </button>
        )}
      </div>

      <Card padding={20}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="t-headline">Performance</div>
          <div style={{ width: 240 }}>
            <SegmentedControl<Span> options={(Object.keys(DAYS) as Span[]).map((k) => ({ value: k, label: k }))} value={span} onChange={setSpan} height={28} fontSize={13} />
          </div>
        </div>
        <RelativeChart recs={picked} days={DAYS[span]} />
      </Card>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 520 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '28%' }} />
                {picked.map((r, i) => (
                  <th key={r.symbol} style={{ ...th, textAlign: 'left' }}>
                    <button onClick={() => dispatch({ type: 'OPEN_STOCK', symbol: r.symbol })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--text)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i] }} />
                        <span style={{ fontSize: 17, fontWeight: 650 }}>{r.symbol}</span>
                      </span>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>{prettyName(r.name)}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Section title="Now" n={picked.length} />
              <LiveRow recs={picked} />
              <Row label="Score" recs={picked} best="max" value={(r) => r.score} show={(r) => <b style={{ color: RATING_META[r.rating].color, ...mono }}>{r.score}</b>} />
              <Row label="Rating" recs={picked} show={(r) => <span style={{ color: RATING_META[r.rating].color, fontWeight: 600 }}>{RATING_META[r.rating].label}</span>} />
              <Row label="Plan" recs={picked} show={(r) => (r.plan ? <span style={{ color: (r.plan.earningsBlock ? EARNINGS_META : ACTION_META[r.plan.action]).color, fontWeight: 500 }}>{(r.plan.earningsBlock ? EARNINGS_META : ACTION_META[r.plan.action]).label}</span> : '—')} />
              <Row label="Entry" recs={picked} show={(r) => (r.plan ? `${formatPrice(r.plan.entryLow)} to ${formatPrice(r.plan.entryHigh)}` : '—')} />
              <Row label="Stop below entry" recs={picked} best="min" value={(r) => r.plan?.riskPct ?? null} show={(r) => (r.plan ? `${(r.plan.riskPct * 100).toFixed(1)}%` : '—')} />
              <Row label="Upside to target 1" recs={picked} best="max" value={(r) => (r.plan ? r.plan.target1 / r.price.last - 1 : null)} show={(r) => (r.plan ? formatPct(r.plan.target1 / r.price.last - 1, 1) : '—')} />
              <Row label="Position size" recs={picked} show={(r) => (r.plan ? `${Math.round(r.plan.positionPct * 100)}%` : '—')} />
              <Row label="Earnings" recs={picked} show={(r) => (r.plan?.earnings ? `in ${r.plan.earnings.days} days` : 'Not in the next 45 days')} />

              <Section title="Signals" n={picked.length} />
              {COMPONENT_ORDER.map((k) => (
                <Row
                  key={k}
                  label={COMPONENT_META[k].label}
                  recs={picked}
                  best="max"
                  value={(r) => r.components[k].score}
                  show={(r) => {
                    const v = r.components[k].score
                    return v == null ? <span style={{ color: 'var(--faint)' }}>No data</span> : <span style={{ color: v > 0.05 ? 'var(--up)' : v < -0.05 ? 'var(--down)' : 'var(--muted)', ...mono }}>{`${v > 0 ? '+' : ''}${Math.round(v * 100)}`}</span>
                  }}
                />
              ))}

              <Section title="Chart" n={picked.length} />
              <Row label="12-month momentum" recs={picked} best="max" value={(r) => r.price.mom12_1 ?? null} show={(r) => pct(r.price.mom12_1, 0)} />
              <Row label="From 52-week high" recs={picked} best="max" value={(r) => (r.price.high52prox != null ? r.price.high52prox - 1 : null)} show={(r) => pct(r.price.high52prox != null ? r.price.high52prox - 1 : null)} />
              <Row label="vs S&P 500, 3 months" recs={picked} best="max" value={(r) => r.price.rs63 ?? null} show={(r) => pct(r.price.rs63)} />
              <Row label="RSI (14 days)" recs={picked} show={(r) => (r.price.rsi14 != null ? r.price.rsi14.toFixed(0) : '—')} />
              <Row label="Daily swing" recs={picked} best="min" value={(r) => (r.price.atr14 ? r.price.atr14 / r.price.last : null)} show={(r) => (r.price.atr14 ? `${((r.price.atr14 / r.price.last) * 100).toFixed(1)}%` : '—')} />
              <Row label="Industry" recs={picked} show={(r) => r.sector ?? '—'} />
              <Row label="Backtest on this stock" recs={picked} show={(r) => (r.backtest?.trades ? `${r.backtest.trades} trades, ${r.backtest.avgR != null && r.backtest.avgR >= 0 ? '+' : ''}${r.backtest.avgR}R` : 'Too few trades')} />
            </tbody>
          </table>
        </div>
      </Card>
      <div className="t-caption">The best value in a row is in bold where higher or lower is clearly better.</div>
    </main>
  )
}

const pct = (v: number | null | undefined, dp = 1) => (v == null ? '—' : <span style={{ color: v >= 0 ? 'var(--up)' : 'var(--down)', ...mono }}>{formatPct(v, dp)}</span>)
const th = { padding: '16px 16px 10px', verticalAlign: 'bottom' } as const
const tdBase = { padding: '11px 16px', borderTop: '1px solid var(--hairline)', verticalAlign: 'top' } as const

function Section({ title, n }: { title: string; n: number }) {
  return (
    <tr>
      <td colSpan={n + 1} style={{ padding: '18px 16px 6px', fontSize: 12.5, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
        {title}
      </td>
    </tr>
  )
}

function Row({ label, recs, show, value, best }: { label: string; recs: Recommendation[]; show: (r: Recommendation) => ReactNode; value?: (r: Recommendation) => number | null; best?: 'max' | 'min' }) {
  let bestIdx = -1
  if (value && best && recs.length > 1) {
    const vals = recs.map(value)
    const valid = vals.filter((v): v is number => v != null)
    if (valid.length > 1 && new Set(valid).size > 1) {
      const target = best === 'max' ? Math.max(...valid) : Math.min(...valid)
      bestIdx = vals.indexOf(target)
    }
  }
  return (
    <tr>
      <td style={{ ...tdBase, color: 'var(--muted)' }}>{label}</td>
      {recs.map((r, i) => (
        <td key={r.symbol} style={{ ...tdBase, fontWeight: i === bestIdx ? 700 : 400 }}>
          {show(r)}
        </td>
      ))}
    </tr>
  )
}

function LiveRow({ recs }: { recs: Recommendation[] }) {
  return (
    <tr>
      <td style={{ ...tdBase, color: 'var(--muted)' }}>Price</td>
      {recs.map((r) => (
        <LiveCell key={r.symbol} r={r} />
      ))}
    </tr>
  )
}

function LiveCell({ r }: { r: Recommendation }) {
  const live = useLive(r.symbol, r.price)
  return (
    <td style={tdBase}>
      <span style={{ fontWeight: 600, ...mono }}>{formatPrice(live.last)}</span> <span style={{ color: live.change >= 0 ? 'var(--up)' : 'var(--down)', fontSize: 13, ...mono }}>{formatPct(live.change)}</span>
    </td>
  )
}

/** Each stock's return since the start of the range, so different prices share one axis. */
function RelativeChart({ recs, days }: { recs: Recommendation[]; days: number }) {
  const series = recs.map((r) => {
    const h = r.price.history.slice(-(days + 1))
    const base = h[0]?.[1]
    return { r, pts: base ? h.map(([t, c]) => [t, c / base - 1] as const) : [] }
  })
  const all = series.flatMap((s) => s.pts.map((p) => p[1]))
  if (!all.length) return <div className="t-sub">No price history.</div>
  const t0 = Math.min(...series.map((s) => s.pts[0]?.[0] ?? Infinity))
  const t1 = Math.max(...series.map((s) => s.pts[s.pts.length - 1]?.[0] ?? -Infinity))
  const lo = Math.min(0, ...all)
  const hi = Math.max(0, ...all)
  const pad = (hi - lo) * 0.08 || 0.01
  const min = lo - pad
  const max = hi + pad
  const W = 1000
  const H = 300
  const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * W
  const y = (v: number) => H - ((v - min) / (max - min)) * H
  // round tick values (1, 2, 2.5 or 5 times a power of ten)
  const raw = (max - min) / 5
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = ([1, 2, 2.5, 5, 10].find((f) => f * mag >= raw) ?? 10) * mag
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(v)
  const months = [] as number[]
  for (let d = new Date(t0 * 1000); d.getTime() / 1000 <= t1; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) months.push(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 1000)
  const pct = (v: number) => `${(v / H) * 100}%`
  return (
    <div>
      <div style={{ position: 'relative', height: 280, marginRight: 48, marginBottom: 22 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} role="img" aria-label="Return since the start of the range">
          {ticks.map((v) => (
            <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-9 ? 'var(--border2)' : 'var(--grid)'} strokeDasharray={Math.abs(v) < 1e-9 ? '6 6' : undefined} vectorEffect="non-scaling-stroke" />
          ))}
          {series.map((s, i) => (
            <path key={s.r.symbol} d={s.pts.map(([t, v], j) => `${j ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} fill="none" stroke={COLORS[i]} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {ticks.map((v) => (
          <span key={v} className="t-caption" style={{ position: 'absolute', left: '100%', top: pct(y(v)), transform: 'translate(8px, -50%)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {`${v > 0 ? '+' : ''}${(v * 100).toFixed(Math.abs(step) < 0.01 ? 1 : 0)}%`}
          </span>
        ))}
        {months
          .filter((m) => m < t1 && m > t0)
          .map((m) => (
            <span key={m} className="t-caption" style={{ position: 'absolute', top: '100%', left: `${(x(m) / W) * 100}%`, transform: 'translate(-50%, 6px)' }}>
              {new Date(m * 1000).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}
            </span>
          ))}
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10 }}>
        {series.map((s, i) => {
          const last = s.pts[s.pts.length - 1]?.[1] ?? 0
          return (
            <span key={s.r.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: COLORS[i] }} />
              <b style={{ fontWeight: 600 }}>{s.r.symbol}</b>
              <span style={{ color: last >= 0 ? 'var(--up)' : 'var(--down)', ...mono }}>{formatPct(last, 1)}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
