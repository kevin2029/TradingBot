import { useMemo, useState } from 'react'
import { Card, SegmentedControl, inputStyle, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { InsiderTrade } from '../types'
import { compactUsd, dayLabel, formatPrice, prettyName } from '../utils/format'
import { NeedsSignals, PageHead } from './Page'

type Tab = 'insiders' | 'congress'
type Filter = 'all' | 'buys' | 'sells' | 'unusual' | 'cluster'

const KIND: Record<InsiderTrade['kind'], { label: string; color: string; hint: string }> = {
  opportunistic: { label: 'Unusual', color: 'var(--info)', hint: 'Breaks this insider\'s yearly pattern. Research finds these trades predict returns' },
  routine: { label: 'Routine', color: 'var(--faint)', hint: 'Same month every year (option exercises, planned sales). Predicts little, so the score ignores it' },
  unclassified: { label: 'New pattern', color: 'var(--muted)', hint: 'Less than 3 years of trading history to judge. Counts half' },
}

export function InsidersPage() {
  return (
    <NeedsSignals>
      <Insiders />
    </NeedsSignals>
  )
}

function Insiders() {
  const { signals } = useAppState()
  const [tab, setTab] = useState<Tab>('insiders')
  const feed = signals!.insiders?.items ?? []
  const congress = signals!.congress?.items ?? []
  return (
    <main className="page">
      <PageHead
        title="Insider activity"
        sub="Open-market trades by company insiders (Form 4 filings, due within 2 business days) and Congress trades per stock (disclosed up to 45 days late). Purchases say more than sales: insiders sell for many reasons, they buy for one."
      />
      <div style={{ maxWidth: 360 }}>
        <SegmentedControl<Tab>
          options={[
            { value: 'insiders', label: `Insiders (${feed.length})` },
            { value: 'congress', label: `Congress (${congress.length})` },
          ]}
          value={tab}
          onChange={setTab}
          height={30}
          fontSize={14}
        />
      </div>
      {tab === 'insiders' ? <InsiderFeed feed={feed} /> : <CongressTable />}
    </main>
  )
}

function InsiderFeed({ feed }: { feed: InsiderTrade[] }) {
  const { signals } = useAppState()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const q = query.trim().toUpperCase()
  const rows = useMemo(
    () =>
      feed.filter(
        (t) =>
          (filter === 'all' || (filter === 'buys' && t.code === 'P') || (filter === 'sells' && t.code === 'S') || (filter === 'unusual' && t.kind === 'opportunistic') || (filter === 'cluster' && t.cluster)) &&
          (!q || t.symbol.startsWith(q) || t.company.toUpperCase().includes(q) || t.insider.toUpperCase().includes(q)),
      ),
    [feed, filter, q],
  )
  const buys = feed.filter((t) => t.code === 'P')
  const sells = feed.filter((t) => t.code === 'S')
  const groups = new Map<string, InsiderTrade[]>()
  for (const t of rows.slice(0, 200)) groups.set(t.filed, [...(groups.get(t.filed) ?? []), t])

  if (!feed.length)
    return (
      <Card padding={24}>
        <div className="t-sub">{signals!.sources.insider?.ok === false ? `Insider data unavailable: ${signals!.sources.insider.error ?? 'add a Finnhub key'}.` : 'No insider trades in the last 90 days, or this data file was built before the feed existed.'}</div>
      </Card>
    )

  return (
    <>
      <Card padding={6}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}>
          <Big label="Purchases, 90 days" value={String(buys.length)} sub={compactUsd(buys.reduce((a, t) => a + t.value, 0))} color="var(--up)" />
          <Big label="Sales, 90 days" value={String(sells.length)} sub={compactUsd(sells.reduce((a, t) => a + t.value, 0))} color="var(--down)" />
          <Big label="Unusual purchases" value={String(buys.filter((t) => t.kind === 'opportunistic').length)} sub="break the yearly pattern" />
          <Big label="Cluster buying" value={String(new Set(buys.filter((t) => t.cluster).map((t) => t.symbol)).size)} sub="stocks with 3+ insiders buying" />
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ticker, company or insider" aria-label="Search insider trades" style={{ ...inputStyle, width: 260, height: 36, border: 'none', background: 'var(--seg-track)' }} />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(
            [
              ['all', 'All'],
              ['buys', 'Purchases'],
              ['sells', 'Sales'],
              ['unusual', 'Unusual'],
              ['cluster', 'Clusters'],
            ] as [Filter, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              className="tap"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              style={{ height: 32, padding: '0 13px', borderRadius: 999, border: 'none', background: filter === k ? 'var(--text)' : 'var(--seg-track)', color: filter === k ? 'var(--bg)' : 'var(--text)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <Card padding={8}>
        {rows.length === 0 && <div className="t-sub" style={{ padding: 16 }}>Nothing matches.</div>}
        {[...groups.entries()].map(([day, list]) => (
          <div key={day}>
            <div className="t-caption" style={{ fontSize: 13, fontWeight: 600, padding: '12px 10px 4px' }}>
              Filed {dayLabel(day).toLowerCase() === 'today' || dayLabel(day).toLowerCase() === 'yesterday' ? dayLabel(day).toLowerCase() : dayLabel(day)}
            </div>
            {list.map((t, i) => (
              <TradeRow key={`${t.symbol}-${t.insider}-${t.date}-${t.code}-${i}`} t={t} />
            ))}
          </div>
        ))}
        {rows.length > 200 && <div className="t-caption" style={{ padding: '10px 10px 6px' }}>Showing the latest 200 of {rows.length}. Search to narrow down.</div>}
      </Card>
      <div className="t-caption" style={{ lineHeight: 1.6 }}>
        <b style={{ fontWeight: 600 }}>Unusual</b>: {KIND.opportunistic.hint}. <b style={{ fontWeight: 600 }}>Routine</b>: {KIND.routine.hint}. <b style={{ fontWeight: 600 }}>New pattern</b>: {KIND.unclassified.hint}. Source: SEC Form 4 via Finnhub.
      </div>
    </>
  )
}

function TradeRow({ t }: { t: InsiderTrade }) {
  const { signals } = useAppState()
  const dispatch = useAppDispatch()
  const buy = t.code === 'P'
  const ranked = signals!.recommendations.some((r) => r.symbol === t.symbol)
  const k = KIND[t.kind]
  return (
    <button
      className="tap row"
      disabled={!ranked}
      onClick={() => dispatch({ type: 'OPEN_STOCK', symbol: t.symbol })}
      title={ranked ? 'Open the stock' : undefined}
      style={{ width: '100%', display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: '10px', border: 'none', borderRadius: 12, background: 'transparent', color: 'var(--text)', textAlign: 'left', cursor: ranked ? 'pointer' : 'default' }}
    >
      <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, background: buy ? 'var(--upsoft)' : 'var(--downsoft)', color: buy ? 'var(--up)' : 'var(--down)' }}>{buy ? 'Buy' : 'Sell'}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <b style={{ fontWeight: 650 }}>{t.symbol}</b> <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>{prettyName(t.company)}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {prettyName(t.insider)} · <span title={k.hint} style={{ color: k.color, fontWeight: 500 }}>{k.label}</span>
          {t.cluster && <span style={{ color: 'var(--up)', fontWeight: 500 }}> · Cluster</span>}
          <span className="hide-sm"> · traded {dayLabel(t.date)}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: buy ? 'var(--up)' : 'var(--text)', ...mono }}>{compactUsd(t.value)}</div>
        <div className="t-caption" style={{ ...mono }}>
          {t.shares.toLocaleString('en-US')} at {t.price ? formatPrice(t.price) : '—'}
        </div>
      </div>
    </button>
  )
}

function CongressTable() {
  const { signals } = useAppState()
  const dispatch = useAppDispatch()
  const [leadersOnly, setLeadersOnly] = useState(false)
  const items = (signals!.congress?.items ?? []).filter((c) => !leadersOnly || c.leaders.length > 0)
  const src = signals!.sources.congress
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="t-sub" style={{ maxWidth: 680 }}>
          Totals per stock over the last 90 days. Party leaders' trades count fully in the score, other members' only a little: studies find only leaders beat the market.
        </div>
        <button
          className="tap"
          aria-pressed={leadersOnly}
          onClick={() => setLeadersOnly((v) => !v)}
          style={{ height: 32, padding: '0 13px', borderRadius: 999, border: 'none', background: leadersOnly ? 'var(--text)' : 'var(--seg-track)', color: leadersOnly ? 'var(--bg)' : 'var(--text)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
        >
          Leaders only
        </button>
      </div>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 640 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: 12.5, textAlign: 'left' }}>
                {['Stock', 'Purchases', 'Sales', 'Members', 'Leaders', 'Latest trade'].map((h) => (
                  <th key={h} style={{ padding: '14px 16px 8px', fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.symbol} onClick={() => c.ranked && dispatch({ type: 'OPEN_STOCK', symbol: c.symbol })} style={{ borderTop: '1px solid var(--hairline)', cursor: c.ranked ? 'pointer' : 'default' }}>
                  <td style={td}>
                    <b style={{ fontWeight: 650 }}>{c.symbol}</b> <span style={{ color: 'var(--muted)', fontSize: 13 }}>{prettyName(c.company)}</span>
                  </td>
                  <td style={{ ...td, color: c.buys ? 'var(--up)' : 'var(--faint)', fontWeight: 600, ...mono }}>{c.buys}</td>
                  <td style={{ ...td, color: c.sells ? 'var(--down)' : 'var(--faint)', fontWeight: 600, ...mono }}>{c.sells}</td>
                  <td style={{ ...td, ...mono }}>{c.buyers + c.sellers}</td>
                  <td style={{ ...td, color: c.leaders.length ? 'var(--text)' : 'var(--faint)' }}>{c.leaders.length ? c.leaders.join(', ') : '—'}</td>
                  <td style={{ ...td, color: 'var(--muted)', ...mono }}>{c.latest ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <div className="t-sub" style={{ padding: 16 }}>No Congress trades in this data file.</div>}
      </Card>
      <div className="t-caption">
        Congress trade data by{' '}
        <a href={src?.attribution.url ?? 'https://www.bargo.ai/free-apis/congress'} target="_blank" rel="noreferrer">
          Bargo
        </a>
        , shown as totals per stock.
      </div>
    </>
  )
}

const td = { padding: '12px 16px', whiteSpace: 'nowrap' } as const

function Big({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.02em', color, ...mono }}>{value}</div>
      {sub && <div className="t-caption" style={{ fontSize: 12.5, ...mono }}>{sub}</div>}
    </div>
  )
}
