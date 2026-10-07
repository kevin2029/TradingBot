import { useMemo, useState } from 'react'
import { Card, SegmentedControl, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { Recommendation } from '../types'
import { formatPct } from '../utils/format'
import { RATING_META } from '../utils/signals'
import { NeedsSignals, PageHead, SectionHead } from './Page'

type Metric = 'ret20' | 'ret63' | 'mom'
const METRIC: Record<Metric, { label: string; get: (r: Recommendation) => number | null | undefined; scale: number }> = {
  ret20: { label: '1 month', get: (r) => r.price.ret20, scale: 0.08 },
  ret63: { label: '3 months', get: (r) => r.price.ret63, scale: 0.15 },
  mom: { label: '12 months', get: (r) => r.price.mom12_1, scale: 0.3 },
}

interface Sector {
  name: string
  stocks: Recommendation[]
  ret20: number | null
  ret63: number | null
  mom: number | null
  above200: number | null
  score: number
}

const avg = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => x != null && Number.isFinite(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export function SectorsPage() {
  return (
    <NeedsSignals>
      <Sectors />
    </NeedsSignals>
  )
}

function Sectors() {
  const { signals } = useAppState()
  const dispatch = useAppDispatch()
  const [metric, setMetric] = useState<Metric>('ret63')
  const [open, setOpen] = useState<string | null>(null)
  const recs = signals!.recommendations

  const sectors = useMemo(() => {
    const by = new Map<string, Recommendation[]>()
    for (const r of recs) if (r.sector) by.set(r.sector, [...(by.get(r.sector) ?? []), r])
    const out: Sector[] = [...by.entries()].map(([name, stocks]) => ({
      name,
      stocks: stocks.slice().sort((a, b) => b.score - a.score),
      ret20: avg(stocks.map((s) => s.price.ret20)),
      ret63: avg(stocks.map((s) => s.price.ret63)),
      mom: avg(stocks.map((s) => s.price.mom12_1)),
      above200: avg(stocks.map((s) => (s.price.sma200 ? (s.price.last > s.price.sma200 ? 1 : 0) : null))),
      score: avg(stocks.map((s) => s.score)) ?? 0,
    }))
    return out
  }, [recs])
  const key = (s: Sector) => (metric === 'ret20' ? s.ret20 : metric === 'ret63' ? s.ret63 : s.mom)
  const sorted = sectors.slice().sort((a, b) => (key(b) ?? -9) - (key(a) ?? -9))
  const m = METRIC[metric]
  const weakest = sorted[sorted.length - 1]

  // breadth across every ranked stock
  const withTrend = recs.filter((r) => r.price.sma200)
  const above200 = withTrend.length ? withTrend.filter((r) => r.price.last > r.price.sma200!).length / withTrend.length : null
  const withMid = recs.filter((r) => r.price.sma50)
  const above50 = withMid.length ? withMid.filter((r) => r.price.last > r.price.sma50!).length / withMid.length : null
  const unknown = recs.filter((r) => !r.sector).length

  return (
    <main className="page">
      <PageHead title="Sectors" sub="Where the market is leading and lagging, from the stocks the app ranks. Momentum tends to persist across whole industries, and the plan keeps at most two positions in one.">
        <div style={{ width: 'min(420px, 100%)' }}>
          <SegmentedControl<Metric> options={(Object.keys(METRIC) as Metric[]).map((k) => ({ value: k, label: METRIC[k].label }))} value={metric} onChange={setMetric} height={30} fontSize={13.5} />
        </div>
      </PageHead>

      <Card padding={6}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px, 100%), 1fr))' }}>
          <Big label="Above 200-day average" value={above200 == null ? '—' : `${Math.round(above200 * 100)}%`} sub="of ranked stocks, long-term trend" tone={above200 == null ? undefined : above200 >= 0.5 ? 'var(--up)' : 'var(--down)'} />
          <Big label="Above 50-day average" value={above50 == null ? '—' : `${Math.round(above50 * 100)}%`} sub="medium-term trend" tone={above50 == null ? undefined : above50 >= 0.5 ? 'var(--up)' : 'var(--down)'} />
          <Big label="Strongest" value={sorted[0]?.name ?? '—'} sub={sorted[0] && key(sorted[0]) != null ? `${formatPct(key(sorted[0])!, 1)} ${m.label}` : undefined} small />
          <Big label="Weakest" value={weakest?.name ?? '—'} sub={weakest && key(weakest) != null ? `${formatPct(key(weakest)!, 1)} ${m.label}` : undefined} small />
        </div>
      </Card>

      <section>
        <SectionHead title="Heat map" sub={`Average ${m.label.toLowerCase()} return per industry. Bigger color, bigger move.`} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(170px, 100%), 1fr))', gap: 8 }}>
          {sorted.map((s) => {
            const v = key(s)
            const strength = v == null ? 0 : Math.min(1, Math.abs(v) / m.scale)
            const base = v == null ? 'var(--seg-track)' : `color-mix(in srgb, ${v >= 0 ? 'var(--up)' : 'var(--down)'} ${Math.round(10 + strength * 62)}%, var(--surface))`
            const strong = strength > 0.55
            return (
              <button
                key={s.name}
                className="tap"
                onClick={() => setOpen(open === s.name ? null : s.name)}
                aria-pressed={open === s.name}
                style={{ textAlign: 'left', border: 'none', borderRadius: 14, padding: '14px 14px 12px', minHeight: 96, background: base, color: strong ? (v != null && v >= 0 ? 'var(--on-up)' : 'var(--on-down)') : 'var(--text)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: open === s.name ? 'inset 0 0 0 2px var(--text)' : undefined }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{s.name}</span>
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 650, letterSpacing: '-.02em', ...mono }}>{v == null ? '—' : formatPct(v, 1)}</span>
                  <span style={{ fontSize: 12.5, opacity: 0.8 }}>
                    {s.stocks.length} stock{s.stocks.length === 1 ? '' : 's'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {unknown > 0 && <div className="t-caption" style={{ marginTop: 8 }}>{unknown} stock{unknown === 1 ? ' has' : 's have'} no industry yet (Finnhub profile missing).</div>}
      </section>

      <section>
        <SectionHead title="All industries" sub="Tap a row to see its stocks" />
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 680 }}>
              <thead>
                <tr style={{ color: 'var(--muted)', fontSize: 12.5, textAlign: 'left' }}>
                  {['Industry', 'Stocks', '1 month', '3 months', '12-month momentum', 'Above 200-day', 'Avg score', 'Best score'].map((h) => (
                    <th key={h} style={{ padding: '14px 14px 8px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <SectorRows key={s.name} s={s} open={open === s.name} onToggle={() => setOpen(open === s.name ? null : s.name)} onOpenStock={(sym) => dispatch({ type: 'OPEN_STOCK', symbol: sym })} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </main>
  )
}

function SectorRows({ s, open, onToggle, onOpenStock }: { s: Sector; open: boolean; onToggle: () => void; onOpenStock: (s: string) => void }) {
  const tone = (v: number | null) => (v == null ? 'var(--faint)' : v >= 0 ? 'var(--up)' : 'var(--down)')
  const best = s.stocks[0]
  return (
    <>
      <tr onClick={onToggle} style={{ borderTop: '1px solid var(--hairline)', cursor: 'pointer', background: open ? 'var(--seg-track)' : undefined }}>
        <td style={{ ...td, fontWeight: 600 }}>{s.name}</td>
        <td style={{ ...td, ...mono }}>{s.stocks.length}</td>
        <td style={{ ...td, color: tone(s.ret20), ...mono }}>{s.ret20 == null ? '—' : formatPct(s.ret20, 1)}</td>
        <td style={{ ...td, color: tone(s.ret63), ...mono }}>{s.ret63 == null ? '—' : formatPct(s.ret63, 1)}</td>
        <td style={{ ...td, color: tone(s.mom), ...mono }}>{s.mom == null ? '—' : formatPct(s.mom, 0)}</td>
        <td style={{ ...td, ...mono }}>{s.above200 == null ? '—' : `${Math.round(s.above200 * 100)}%`}</td>
        <td style={{ ...td, ...mono }}>{Math.round(s.score)}</td>
        <td style={td}>
          {best && (
            <span>
              <b style={{ fontWeight: 600 }}>{best.symbol}</b> <span style={{ color: RATING_META[best.rating].color, ...mono }}>{best.score}</span>
            </span>
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} style={{ padding: '4px 14px 14px', background: 'var(--seg-track)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {s.stocks.map((r) => (
                <button key={r.symbol} className="tap" onClick={() => onOpenStock(r.symbol)} style={{ display: 'flex', gap: 6, alignItems: 'baseline', border: 'none', background: 'var(--surface)', color: 'var(--text)', borderRadius: 999, padding: '6px 12px', fontSize: 13.5, cursor: 'pointer' }}>
                  <b style={{ fontWeight: 600 }}>{r.symbol}</b>
                  <span style={{ color: RATING_META[r.rating].color, ...mono }}>{r.score}</span>
                  <span style={{ color: (r.price.ret63 ?? 0) >= 0 ? 'var(--up)' : 'var(--down)', ...mono }}>{r.price.ret63 != null ? formatPct(r.price.ret63, 0) : ''}</span>
                </button>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const td = { padding: '12px 14px', whiteSpace: 'nowrap' } as const

function Big({ label, value, sub, tone, small }: { label: string; value: string; sub?: string; tone?: string; small?: boolean }) {
  return (
    <div style={{ padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: small ? 17 : 26, fontWeight: 600, letterSpacing: '-.02em', color: tone, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: small ? 6 : 0, ...mono }}>{value}</div>
      {sub && <div className="t-caption" style={{ fontSize: 12.5, ...mono }}>{sub}</div>}
    </div>
  )
}
