import { useMemo, useState } from 'react'
import { Card, Eyebrow, SegmentedControl, mono, prettyLabel } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { HotStock, NewListing, QuickPrice, RankingRef } from '../types'
import { formatPct, formatPrice, prettyName } from '../utils/format'
import { RATING_META, useLive } from '../utils/signals'
import { PriceChart } from './PriceChart'
import { ChangeBadge, ScoreBadge } from './RecommendationList'
import { PageHead } from './Page'
import { StarButton } from './StarButton'
import { ACTION_META } from './TradePlanCard'

type Tab = 'hot' | 'new'
type HotSort = 'rank' | 'spike' | 'swing' | 'move'

const HOT_SORTS: { value: HotSort; label: string }[] = [
  { value: 'rank', label: 'Most mentioned' },
  { value: 'spike', label: 'Mentions rising fastest' },
  { value: 'swing', label: 'Most volatile (daily swing)' },
  { value: 'move', label: "Biggest move today" },
]

const DAY = 86400000
const todayIso = () => new Date().toISOString().slice(0, 10)
const daysUntil = (iso: string) => Math.round((new Date(`${iso}T12:00:00Z`).getTime() - Date.now()) / DAY)
const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const spike = (h: HotStock) => (h.mentions24h > 0 ? h.mentions / h.mentions24h : h.mentions > 0 ? 10 : 1)
const bigMoney = (v: number) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${Math.round(v / 1e6)}M`)

/** How wild a stock is, from its average daily swing (ATR as % of price). */
function swingMeta(p: QuickPrice | null) {
  const s = p?.atrPct ?? null
  if (s == null) return null
  if (s >= 0.06) return { label: 'VERY VOLATILE', color: 'var(--down)' }
  if (s >= 0.035) return { label: 'VOLATILE', color: 'var(--warn)' }
  return null
}

/** Popular (WallStreetBets), highly volatile and newly listed stocks. Not recommendations. */
export function HotPage() {
  const { signals, hotSelected } = useAppState()
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState<Tab>('hot')
  const [sort, setSort] = useState<HotSort>('rank')

  const hot = signals?.hot?.items ?? []
  const ipos = signals?.ipos?.items ?? []
  const hotRows = useMemo(() => {
    const rows = [...hot]
    if (sort === 'rank') rows.sort((a, b) => a.rank - b.rank)
    if (sort === 'spike') rows.sort((a, b) => spike(b) - spike(a))
    if (sort === 'swing') rows.sort((a, b) => (b.price.atrPct ?? 0) - (a.price.atrPct ?? 0))
    if (sort === 'move') rows.sort((a, b) => Math.abs(b.price.change1d) - Math.abs(a.price.change1d))
    return rows
  }, [hot, sort])
  const today = todayIso()
  const upcoming = ipos.filter((i) => i.date > today).sort((a, b) => a.date.localeCompare(b.date))
  const recent = ipos.filter((i) => i.date <= today).sort((a, b) => b.date.localeCompare(a.date))

  if (!signals) return <main className="page" />
  if (!signals.hot && !signals.ipos) {
    return (
      <main className="page">
        <Card padding={24}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.015em', marginBottom: 6 }}>No data yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>The current signals file was built before this page existed. It appears after the next data run.</div>
        </Card>
      </main>
    )
  }

  const keyOf = (i: NewListing) => i.symbol ?? `ipo:${i.name}`
  // on narrow screens the detail sits under the list: bring it into view
  const pick = (key: string) => {
    dispatch({ type: 'SELECT_HOT', symbol: key })
    if (window.innerWidth <= 980) requestAnimationFrame(() => document.getElementById('hot-detail')?.scrollIntoView({ behavior: 'smooth' }))
  }
  const pickedHot = tab === 'hot' ? hot.find((h) => h.symbol === hotSelected) ?? hotRows[0] : undefined
  const pickedIpo = tab === 'new' ? ipos.find((i) => keyOf(i) === hotSelected) ?? recent.find((i) => i.price) ?? recent[0] ?? upcoming[0] : undefined

  return (
    <main className="page">
      <PageHead
        title="Hot & new"
        sub={
          <>
            <span style={{ color: 'var(--warn)', fontWeight: 600 }}>Speculative, not recommendations.</span> These stocks are here because they are popular or new, not because the signals like them. Heavy hype tends to come before weaker returns, and new listings often drop when the lock-up ends.
          </>
        }
      />
      <section className="main-grid">
        <Card padding={0} className="sticky-col" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 16px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SegmentedControl<Tab>
              options={[
                { value: 'hot', label: `Hot & volatile (${hot.length})` },
                { value: 'new', label: `New listings (${ipos.length})` },
              ]}
              value={tab}
              onChange={setTab}
              height={30}
              fontSize={13}
            />
            {tab === 'hot' ? (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value as HotSort)} style={select}>
                  {HOT_SORTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="t-caption" style={{ fontSize: 13, lineHeight: 1.45 }}>
                IPOs from the last 5 months and the next 30 days (no blank-check companies or tiny deals). A listing joins the normal ranking after {signals.ipos?.minBars ?? 63} trading days.
              </div>
            )}
          </div>
          <div className="list-scroll" style={{ overflowY: 'auto', maxHeight: 'min(760px, calc(100vh - 260px))', padding: '0 8px 8px' }}>
            {tab === 'hot' &&
              (hotRows.length === 0 ? (
                <Empty text="No WallStreetBets data in the last run." />
              ) : (
                hotRows.map((h) => <HotRow key={h.symbol} h={h} active={pickedHot?.symbol === h.symbol} onClick={() => pick(h.symbol)} />)
              ))}
            {tab === 'new' && (
              <>
                {ipos.length === 0 && <Empty text={signals.sources.ipos?.ok === false ? `IPO calendar unavailable: ${signals.sources.ipos.error ?? 'needs a Finnhub key'}` : 'No IPOs in this window.'} />}
                {upcoming.length > 0 && <GroupLabel>Upcoming</GroupLabel>}
                {upcoming.map((i) => (
                  <IpoRow key={keyOf(i)} i={i} active={pickedIpo === i} onClick={() => pick(keyOf(i))} />
                ))}
                {recent.length > 0 && <GroupLabel>Recently listed</GroupLabel>}
                {recent.map((i) => (
                  <IpoRow key={keyOf(i)} i={i} active={pickedIpo === i} onClick={() => pick(keyOf(i))} />
                ))}
              </>
            )}
          </div>
        </Card>
        <div id="hot-detail" style={{ minWidth: 0, scrollMarginTop: 72 }}>
          {pickedHot && <HotDetail h={pickedHot} />}
          {pickedIpo && <IpoDetail i={pickedIpo} minBars={signals.ipos?.minBars ?? 63} lockupDays={signals.ipos?.lockupDays ?? 180} />}
        </div>
      </section>
    </main>
  )
}

const select = { height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--info)', fontSize: 13, fontWeight: 500, padding: '0 6px', cursor: 'pointer', backgroundPosition: 'calc(100% - 12px) 50%, calc(100% - 7px) 50%' } as const

function Empty({ text }: { text: string }) {
  return <div className="t-sub" style={{ padding: '20px 12px' }}>{text}</div>
}

function GroupLabel({ children }: { children: string }) {
  return (
    <div style={{ padding: '12px 10px 4px' }}>
      <Eyebrow>{children}</Eyebrow>
    </div>
  )
}

function Tag({ label, color, title }: { label: string; color: string; title?: string }) {
  return (
    <span title={title} style={{ fontSize: 12.5, fontWeight: 500, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function rowStyle(active: boolean) {
  return {
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
  } as const
}

function HotRow({ h, active, onClick }: { h: HotStock; active: boolean; onClick: () => void }) {
  const live = useLive(h.symbol, h.price)
  const sw = swingMeta(h.price)
  const rising = spike(h) >= 3 && h.mentions >= 20
  const tags = [sw && { label: sw.label, color: sw.color }, rising && { label: 'Mentions spiking', color: 'var(--warn)' }].filter(Boolean) as { label: string; color: string }[]
  return (
    <button className="tap row" onClick={onClick} style={rowStyle(active)}>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--faint)', textAlign: 'center', ...mono }}>{h.rank}</span>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-.01em' }}>
          {h.symbol}
          {h.ranking && <span style={{ fontSize: 12.5, fontWeight: 500, color: RATING_META[h.ranking.rating].color, marginLeft: 8 }}>Score {h.ranking.score}</span>}
        </span>
        <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {prettyName(h.name)} · <span style={mono}>{h.mentions}</span> mentions
        </span>
        <span style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--faint)' }}>
          {h.price.atrPct != null && <span style={{ ...mono }}>±{(h.price.atrPct * 100).toFixed(1)}% a day</span>}
          {tags.map((t) => (
            <span key={t.label} style={{ color: t.color, fontWeight: 500 }}>
              {' · '}
              {t.label}
            </span>
          ))}
        </span>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 500, ...mono }}>{formatPrice(live.last)}</span>
        <ChangeBadge change={live.change} width={68} />
      </div>
    </button>
  )
}

function IpoRow({ i, active, onClick }: { i: NewListing; active: boolean; onClick: () => void }) {
  const live = useLive(i.symbol ?? '', i.price)
  const d = daysUntil(i.date)
  const since = i.price && i.firstClose ? live.last / i.firstClose - 1 : null
  return (
    <button className="tap row" onClick={onClick} style={rowStyle(active)}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--faint)', lineHeight: 1.25, textAlign: 'center', ...mono }}>{new Date(`${i.date}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-.01em' }}>{i.symbol ?? '—'}</span>
          {d > 0 ? (
            <Tag label={`in ${d} day${d === 1 ? '' : 's'}`} color="var(--info)" />
          ) : i.ranking ? (
            <Tag label={`Score ${i.ranking.score}`} color={RATING_META[i.ranking.rating].color} />
          ) : (
            <Tag label="Too new to score" color="var(--faint)" title="Not enough price history to score" />
          )}
          {d <= 0 && daysUntil(i.lockupDate) >= 0 && daysUntil(i.lockupDate) <= 30 && <Tag label="Lock-up ends soon" color="var(--warn)" />}
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {prettyName(i.name)}
          {i.exchange && <span style={{ color: 'var(--faint)' }}> · {i.exchange}</span>}
        </span>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {i.price ? (
          <>
            <span style={{ fontSize: 15, fontWeight: 500, ...mono }}>{formatPrice(live.last)}</span>
            {since != null && (
              <span title="Since the first day's close">
                <ChangeBadge change={since} width={68} />
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: 14, color: 'var(--muted)', ...mono }}>{priceRange(i)}</span>
        )}
      </div>
    </button>
  )
}

function priceRange(i: NewListing) {
  if (i.priceLow == null) return 'price tbd'
  return i.priceHigh != null && i.priceHigh !== i.priceLow ? `$${i.priceLow}–${i.priceHigh}` : `$${i.priceLow}`
}

function Stat({ label, value, color, title }: { label: string; value: string; color?: string; title?: string }) {
  return (
    <div title={title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '10px 0', borderTop: '1px solid var(--hairline)' }}>
      <span style={{ fontSize: 14, color: 'var(--muted)' }}>{prettyLabel(label)}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color, ...mono }}>{value}</span>
    </div>
  )
}

const statGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', columnGap: 28 } as const

function Header({ name, symbol, live, extra, ranking }: { name: string; symbol: string | null; live: ReturnType<typeof useLive> | null; extra?: string; ranking: RankingRef | null }) {
  const up = (live?.change ?? 0) >= 0
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
      <div style={{ minWidth: 0 }}>
        <div className="t-caption" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.02em' }}>
          {symbol ?? 'No ticker yet'}
          {live?.live && <span style={{ color: 'var(--up)' }}> · Live</span>}
        </div>
        <h2 className="t-display" style={{ margin: '2px 0 0', fontSize: 28 }}>
          {prettyName(name)}
        </h2>
        {live && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', ...mono }}>{formatPrice(live.last)}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: up ? 'var(--up)' : 'var(--down)', ...mono }}>{formatPct(live.change)}</span>
            <span className="t-caption" style={{ fontSize: 14 }}>
              today
            </span>
          </div>
        )}
        {extra && <div className="t-sub" style={{ marginTop: 6 }}>{extra}</div>}
        {symbol && live && (
          <div style={{ marginTop: 12 }}>
            <StarButton symbol={symbol} />
          </div>
        )}
      </div>
      {ranking && symbol && <RankingBox symbol={symbol} ranking={ranking} />}
    </div>
  )
}

/** The stock is also in the normal ranking: show its score and a way to open the full plan. */
function RankingBox({ symbol, ranking }: { symbol: string; ranking: RankingRef }) {
  const dispatch = useAppDispatch()
  const meta = RATING_META[ranking.rating]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.015em', color: meta.color }}>{meta.label}</div>
        {ranking.action && <div style={{ fontSize: 13, color: ACTION_META[ranking.action].color, fontWeight: 500 }}>{ACTION_META[ranking.action].label}</div>}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            dispatch({ type: 'OPEN_STOCK', symbol })
          }}
          style={{ fontSize: 12 }}
        >
          Open the plan
        </a>
      </div>
      <ScoreBadge score={ranking.score} color={meta.color} size={56} />
    </div>
  )
}

function NotScored({ text }: { text: string }) {
  return <div style={{ fontSize: 12.5, color: 'var(--muted)', background: 'var(--inset)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.5 }}>{text}</div>
}

function HotDetail({ h }: { h: HotStock }) {
  const { signals } = useAppState()
  const live = useLive(h.symbol, h.price)
  const p = h.price
  const mentionChange = h.mentions24h > 0 ? h.mentions / h.mentions24h - 1 : null
  const volRatio = p.volume20 ? p.volume / p.volume20 : null
  return (
    <Card padding={20} style={{ minWidth: 0 }}>
      <Header name={h.name} symbol={h.symbol} live={live} ranking={h.ranking} />
      <PriceChart symbol={h.symbol} history={p.history} livePrice={live.live ? live.last : undefined} liveTs={live.ts} intraday={signals?.intraday?.[h.symbol]} />
      <div style={{ ...statGrid, marginTop: 16 }}>
        <Stat label="WSB RANK" value={`#${h.rank}${h.rank24h ? ` (was #${h.rank24h})` : ''}`} />
        <Stat label="MENTIONS 24H" value={String(h.mentions)} title={`${h.mentions24h} a day earlier`} />
        <Stat label="VS DAY BEFORE" value={mentionChange == null ? 'new' : formatPct(mentionChange, 0)} color={mentionChange == null || mentionChange > 0 ? 'var(--warn)' : undefined} />
        <Stat label="DAILY SWING" value={p.atrPct == null ? '—' : `${(p.atrPct * 100).toFixed(1)}%`} color={swingMeta(p)?.color} title="Average true range over 14 days as a share of the price" />
        <Stat label="SWING / 100 SH" value={p.atr14 ? `±${formatPrice(p.atr14 * 100)}` : '—'} title="Typical move in one day for 100 shares" />
        <Stat label="1M RETURN" value={formatPct(p.ret20, 1)} color={p.ret20 >= 0 ? 'var(--up)' : 'var(--down)'} />
        <Stat label="VOLUME VS AVG" value={volRatio == null ? '—' : `${volRatio.toFixed(1)}x`} color={volRatio != null && volRatio >= 2 ? 'var(--warn)' : undefined} />
      </div>
      {!h.ranking && (
        <div style={{ marginTop: 14 }}>
          <NotScored text="Not in the ranking, so there is no score or trade plan. If you trade it anyway: use a small position, set a stop before you buy, and expect moves of a few times the daily swing." />
        </div>
      )}
    </Card>
  )
}

function IpoDetail({ i, minBars, lockupDays }: { i: NewListing; minBars: number; lockupDays: number }) {
  const { signals } = useAppState()
  const live = useLive(i.symbol ?? '', i.price)
  const d = daysUntil(i.date)
  const lock = daysUntil(i.lockupDate)
  const since = i.price && i.firstClose ? live.last / i.firstClose - 1 : null
  const vsIpo = i.price && i.priceHigh ? live.last / i.priceHigh - 1 : null
  const extra = d > 0 ? `Expected to list on ${shortDate(i.date)} (in ${d} day${d === 1 ? '' : 's'})${i.exchange ? ` on ${i.exchange}` : ''}.` : `Listed on ${shortDate(i.date)}${i.exchange ? ` on ${i.exchange}` : ''}.`
  return (
    <Card padding={20} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Header name={i.name} symbol={i.symbol} live={i.price ? live : null} extra={extra} ranking={i.ranking} />
      {i.price && i.symbol ? (
        <PriceChart symbol={i.symbol} history={i.price.history} livePrice={live.live ? live.last : undefined} liveTs={live.ts} intraday={signals?.intraday?.[i.symbol]} />
      ) : (
        <NotScored text={d > 0 ? 'No prices yet. The chart appears after the first trading day.' : 'No price data found for this listing yet.'} />
      )}
      <div style={statGrid}>
        <Stat label="IPO PRICE" value={priceRange(i)} />
        {i.dealValue != null && <Stat label="DEAL SIZE" value={bigMoney(i.dealValue)} />}
        <Stat label="STATUS" value={i.status.toUpperCase()} />
        {d <= 0 && <Stat label="TRADING DAYS" value={String(i.listedDays)} />}
        {since != null && <Stat label="SINCE DAY 1" value={formatPct(since, 1)} color={since >= 0 ? 'var(--up)' : 'var(--down)'} title="Since the first day's close" />}
        {vsIpo != null && <Stat label="VS IPO PRICE" value={formatPct(vsIpo, 1)} color={vsIpo >= 0 ? 'var(--up)' : 'var(--down)'} />}
        {i.price?.atrPct != null && <Stat label="DAILY SWING" value={`${(i.price.atrPct * 100).toFixed(1)}%`} color={swingMeta(i.price)?.color} />}
        <Stat label="LOCK-UP ENDS" value={lock < 0 ? 'passed' : `${i.lockupDate.slice(5)} (${lock}d)`} color={lock >= 0 && lock <= 30 ? 'var(--warn)' : undefined} title={`About ${lockupDays} days after the IPO, early investors may start selling`} />
      </div>
      {!i.ranking && (
        <NotScored
          text={
            d > 0
              ? `Too new to score. Once it has ${minBars} trading days of prices (about 3 months) it joins the normal ranking automatically.`
              : `Too new to score: ${i.listedDays} of ${minBars} trading days. Momentum, the 52 week high and insider data all need history, so any score now would be a guess. It joins the ranking automatically after about 3 months.`
          }
        />
      )}
      <div style={{ fontSize: 11.5, color: 'var(--faint)', lineHeight: 1.5 }}>
        Around the end of the lock-up (usually {lockupDays} days after the IPO) early investors may sell, and prices often drop then. On average, new listings have lagged the market in the years after their IPO.
      </div>
    </Card>
  )
}
