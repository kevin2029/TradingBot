import type { ReactNode } from 'react'
import { Card, mono } from '../ui/Primitives'
import { ChevronRightIcon } from '../ui/Logo'
import { useAppDispatch, useAppState } from '../state/store'
import type { Benchmark, Recommendation, View } from '../types'
import { RATING_META, REGIME_META, useLive } from '../utils/signals'
import { formatCountdown } from '../utils/marketClock'
import { formatPct, formatPrice, prettyName } from '../utils/format'
import { evaluatePosition } from '../utils/positions'
import { needsLook, watchNotes } from '../utils/watch'
import { EXCHANGES, exchangeStatus } from '../utils/worldMarkets'
import { Sparkline } from './Sparkline'
import { ScoreBadge } from './RecommendationList'
import { ACTION_META, EARNINGS_META } from './TradePlanCard'
import { MarketStatus } from './Header'
import { useNow } from './MarketClock'
import { Freshness, NeedsSignals, PageHead, SectionHead } from './Page'

const DAY = 86400000
const todayIso = () => new Date().toISOString().slice(0, 10)
const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export function OverviewPage() {
  return (
    <NeedsSignals>
      <Overview />
    </NeedsSignals>
  )
}

function Overview() {
  const { signals } = useAppState()
  const s = signals!
  const regime = REGIME_META[s.market.regime]
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="page">
      <div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <span className="t-caption" style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em' }}>
            {today}
          </span>
          <span className="only-narrow">
            <MarketStatus />
          </span>
        </div>
        <PageHead
          title="Market today"
          sub={
            <>
              <span style={{ color: regime.color, fontWeight: 600 }}>{regime.label}.</span> {s.market.summary}
              <div style={{ marginTop: 4 }}>
                <Freshness />
              </div>
            </>
          }
        />
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 12 }}>
        {s.market.indices.map((b) => (
          <IndexTile key={b.symbol} b={b} />
        ))}
      </section>

      <TopIdeas />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(270px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
        <YourWatchlist />
        <YourPositions />
        <ComingUp />
        <HotTeaser />
      </section>

      <WorldMarkets />
    </main>
  )
}

function IndexTile({ b }: { b: Benchmark }) {
  const { last, change } = useLive(b.symbol, b)
  const up = change >= 0
  const color = up ? 'var(--up)' : 'var(--down)'
  return (
    <Card padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color, ...mono }}>{formatPct(change)}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', ...mono }}>{formatPrice(last)}</div>
      <div style={{ marginTop: 6 }}>
        <Sparkline values={b.history.slice(-60).map((h) => h[1])} color={color} softColor="transparent" width="100%" height={34} />
      </div>
    </Card>
  )
}

/** The best-scoring stocks with what to do next, one tap from the full plan. */
function TopIdeas() {
  const { signals } = useAppState()
  const recs = signals!.recommendations
  const buys = recs.filter((r) => r.rating === 'strong-buy' || r.rating === 'buy')
  const list = (buys.length ? buys : recs).slice(0, 4)
  if (!list.length) return null
  return (
    <section>
      <SectionHead
        title="Top ideas"
        sub={buys.length ? `${buys.length} stock${buys.length === 1 ? '' : 's'} rated Buy or better. Open one for the full plan.` : 'Nothing rates a Buy right now. These score highest; check the plan before acting.'}
        action={<GoTo view="stocks" label="All stocks" />}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(270px, 100%), 1fr))', gap: 16 }}>
        {list.map((r) => (
          <IdeaCard key={r.symbol} r={r} />
        ))}
      </div>
    </section>
  )
}

function IdeaCard({ r }: { r: Recommendation }) {
  const dispatch = useAppDispatch()
  const live = useLive(r.symbol, r.price)
  const meta = RATING_META[r.rating]
  const plan = r.plan
  const act = plan ? (plan.earningsBlock ? EARNINGS_META : ACTION_META[plan.action]) : null
  const up = live.change >= 0
  return (
    <button
      className="tap"
      onClick={() => dispatch({ type: 'OPEN_STOCK', symbol: r.symbol })}
      style={{ textAlign: 'left', border: 'none', cursor: 'pointer', color: 'var(--text)', background: 'var(--surface)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, width: '100%' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: '-.01em' }}>{r.symbol}</div>
          <div className="t-caption" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
            {prettyName(r.name)}
          </div>
        </div>
        <ScoreBadge score={r.score} color={meta.color} size={44} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, width: '100%' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, ...mono }}>{formatPrice(live.last)}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: up ? 'var(--up)' : 'var(--down)', ...mono }}>{formatPct(live.change)} today</div>
        </div>
        <Sparkline values={r.price.history.slice(-40).map((h) => h[1])} color={up ? 'var(--up)' : 'var(--down)'} softColor="transparent" width={80} height={32} />
      </div>
      <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12, width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>
          {meta.label}
          {act && <span style={{ color: act.color }}> · {act.label}</span>}
        </span>
        {plan && plan.action !== 'avoid' && (
          <span className="t-caption" style={{ fontSize: 13 }}>
            {plan.action === 'wait' ? `Buy above ${formatPrice(plan.entryLow)}` : `Entry ${formatPrice(plan.entryLow)} to ${formatPrice(plan.entryHigh)}`}, stop {formatPrice(plan.stop)}
          </span>
        )}
      </div>
    </button>
  )
}

function YourPositions() {
  const { positions, quotes, signals } = useAppState()
  const dispatch = useAppDispatch()
  const open = positions.filter((p) => !p.closed)
  const views = open.map((p) => evaluatePosition(p, quotes[p.symbol]?.price, signals?.recommendations.find((r) => r.symbol === p.symbol)))
  // what needs attention first
  const order = { stop: 0, target1: 1, target2: 2, weak: 3, 'below-entry': 4, 'no-price': 5, 'on-track': 6, closed: 7 } as const
  views.sort((a, b) => order[a.status.key] - order[b.status.key])
  const withPnl = views.filter((v) => v.pnlUsd != null)
  const total = withPnl.reduce((a, v) => a + (v.pnlUsd ?? 0), 0)
  return (
    <Panel title="Your positions" action={<GoTo view="positions" label="Open" />}>
      {open.length === 0 ? (
        <div className="t-sub">Nothing tracked yet. On any stock's plan, tap "I bought this" to follow it against the plan here.</div>
      ) : (
        <>
          <div className="t-sub" style={{ marginBottom: 6 }}>
            {open.length} open
            {withPnl.length > 0 && (
              <>
                {' · '}
                <span style={{ color: total >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 600, ...mono }}>
                  {total >= 0 ? '+' : '−'}${Math.abs(total).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>{' '}
                unrealised
              </>
            )}
          </div>
          {views.slice(0, 4).map((v) => (
            <ListRow
              key={v.position.id}
              onClick={() => dispatch({ type: 'OPEN_STOCK', symbol: v.position.symbol })}
              left={<b style={{ fontWeight: 600 }}>{v.position.symbol}</b>}
              middle={<span style={{ color: v.status.color, fontWeight: 500 }}>{v.status.label}</span>}
              right={v.pnlPct == null ? '—' : <span style={{ color: v.pnlPct >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 600, ...mono }}>{formatPct(v.pnlPct, 1)}</span>}
            />
          ))}
        </>
      )}
    </Panel>
  )
}

/** Starred stocks that changed: entry zone reached, rating moved, earnings close. */
function YourWatchlist() {
  const { watchlist, signals, quotes } = useAppState()
  const dispatch = useAppDispatch()
  const items = watchlist
    .map((w) => {
      const rec = signals!.recommendations.find((r) => r.symbol === w.symbol)
      const notes = watchNotes(w, rec, quotes[w.symbol]?.price ?? rec?.price.last ?? null)
      return { w, notes }
    })
    .filter((x) => needsLook(x.notes))
  const tone = { good: 'var(--up)', bad: 'var(--down)', warn: 'var(--warn)', info: 'var(--muted)' } as const
  return (
    <Panel title="Watchlist" sub={watchlist.length ? `${watchlist.length} starred, ${items.length} worth a look` : undefined} action={<GoTo view="watchlist" label="Open" />}>
      {watchlist.length === 0 ? (
        <div className="t-sub">Star stocks you want to follow. They are checked every data run for the entry zone, rating changes and earnings.</div>
      ) : items.length === 0 ? (
        <div className="t-sub">Nothing new on your starred stocks.</div>
      ) : (
        items.slice(0, 4).map(({ w, notes }) => (
          <ListRow
            key={w.symbol}
            onClick={() => dispatch({ type: 'OPEN_STOCK', symbol: w.symbol })}
            left={<b style={{ fontWeight: 600 }}>{w.symbol}</b>}
            middle={<span style={{ color: tone[notes[0].tone], fontWeight: 500 }}>{notes[0].text}</span>}
            right={notes.length > 1 ? <span className="t-caption">+{notes.length - 1}</span> : null}
          />
        ))
      )}
    </Panel>
  )
}

/** Earnings of ranked stocks and upcoming IPOs in the next two weeks. */
function ComingUp() {
  const { signals } = useAppState()
  const dispatch = useAppDispatch()
  const today = todayIso()
  const horizon = new Date(Date.now() + 14 * DAY).toISOString().slice(0, 10)
  const items: { date: string; key: string; label: ReactNode; detail: string; onClick: () => void }[] = []
  for (const r of signals!.recommendations) {
    const e = r.plan?.earnings
    if (e && e.date >= today && e.date <= horizon && r.score >= 45)
      items.push({ date: e.date, key: `e-${r.symbol}`, label: <b style={{ fontWeight: 600 }}>{r.symbol}</b>, detail: `Earnings${e.hour === 'bmo' ? ', before open' : e.hour === 'amc' ? ', after close' : ''}`, onClick: () => dispatch({ type: 'OPEN_STOCK', symbol: r.symbol }) })
  }
  for (const i of signals!.ipos?.items ?? []) {
    if (i.date > today && i.date <= horizon)
      items.push({ date: i.date, key: `i-${i.symbol ?? i.name}`, label: <b style={{ fontWeight: 600 }}>{i.symbol ?? i.name}</b>, detail: 'IPO', onClick: () => dispatch({ type: 'SET_VIEW', view: 'hot' }) })
  }
  items.sort((a, b) => a.date.localeCompare(b.date))
  return (
    <Panel title="Coming up" sub="Next 14 days">
      {items.length === 0 ? (
        <div className="t-sub">No earnings reports for stocks on watch and no IPOs in the next two weeks.</div>
      ) : (
        items.slice(0, 6).map((it) => <ListRow key={it.key} onClick={it.onClick} left={<span className="t-caption" style={{ fontSize: 13, ...mono }}>{shortDate(it.date)}</span>} middle={it.label} right={<span className="t-caption" style={{ fontSize: 13 }}>{it.detail}</span>} />)
      )}
    </Panel>
  )
}

function HotTeaser() {
  const { signals } = useAppState()
  const dispatch = useAppDispatch()
  const hot = (signals!.hot?.items ?? []).slice(0, 5)
  return (
    <Panel title="Hot right now" sub="Most mentioned on r/wallstreetbets" action={<GoTo view="hot" label="Hot & new" />}>
      {hot.length === 0 ? (
        <div className="t-sub">No WallStreetBets data in the last run.</div>
      ) : (
        hot.map((h) => (
          <ListRow
            key={h.symbol}
            onClick={() => {
              dispatch({ type: 'SELECT_HOT', symbol: h.symbol })
              dispatch({ type: 'SET_VIEW', view: 'hot' })
            }}
            left={<span className="t-caption" style={{ fontSize: 13, width: 22, display: 'inline-block', ...mono }}>#{h.rank}</span>}
            middle={<b style={{ fontWeight: 600 }}>{h.symbol}</b>}
            right={
              <span className="t-caption" style={{ fontSize: 13, ...mono }}>
                {h.price.atrPct != null ? `±${(h.price.atrPct * 100).toFixed(1)}% a day` : `${h.mentions} mentions`}
              </span>
            }
          />
        ))
      )}
    </Panel>
  )
}

/** Main stock exchanges: open now or how long until they open. */
function WorldMarkets() {
  const now = useNow(1000)
  return (
    <section>
      <SectionHead title="World markets" sub="Local trading hours, holidays outside the US not included" />
      <Card padding={6}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))' }}>
          {EXCHANGES.map((ex) => {
            const st = exchangeStatus(ex, now)
            const open = st.state === 'open'
            const color = open ? 'var(--up)' : st.state === 'break' ? 'var(--warn)' : 'var(--faint)'
            const left = formatCountdown(st.nextAt - now)
            return (
              <div key={ex.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{ex.city}</div>
                  <div className="t-caption" style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ex.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, ...mono }}>{st.localTime}</div>
                  <div style={{ fontSize: 12.5, color: open ? 'var(--up)' : 'var(--muted)', ...mono }}>{open ? `closes in ${left}` : st.state === 'break' ? `lunch, ${left}` : `opens in ${left}`}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </section>
  )
}

// ---- small building blocks ---------------------------------------------------------

function Panel({ title, sub, action, children }: { title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <div>
          <div className="t-headline">{title}</div>
          {sub && <div className="t-caption" style={{ fontSize: 13 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}

function ListRow({ left, middle, right, onClick }: { left: ReactNode; middle: ReactNode; right: ReactNode; onClick: () => void }) {
  return (
    <button
      className="tap row"
      onClick={onClick}
      style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', width: 'calc(100% + 16px)', margin: '0 -8px', padding: '9px 8px', border: 'none', background: 'none', color: 'var(--text)', textAlign: 'left', fontSize: 14, cursor: 'pointer', borderRadius: 10 }}
    >
      <span>{left}</span>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{middle}</span>
      <span>{right}</span>
    </button>
  )
}

function GoTo({ view, label }: { view: View; label: string }) {
  const dispatch = useAppDispatch()
  return (
    <button onClick={() => dispatch({ type: 'SET_VIEW', view })} style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', color: 'var(--info)', fontSize: 14, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
      {label}
      <ChevronRightIcon />
    </button>
  )
}
