import { useState } from 'react'
import { Card, SegmentedControl } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { marketEvents } from '../utils/marketClock'
import { dayLabel, prettyName } from '../utils/format'
import { RATING_META } from '../utils/signals'
import { NeedsSignals, PageHead } from './Page'

type Kind = 'earnings' | 'ipo' | 'lockup' | 'holiday' | 'early'
interface Ev {
  date: string
  kind: Kind
  title: string
  detail: string
  mine?: 'holding' | 'watching'
  symbol?: string
  ranked?: boolean
  color?: string
}

const KIND: Record<Kind, { label: string; color: string }> = {
  earnings: { label: 'Earnings', color: 'var(--warn)' },
  ipo: { label: 'IPO', color: 'var(--info)' },
  lockup: { label: 'Lock-up ends', color: 'var(--down)' },
  holiday: { label: 'Market closed', color: 'var(--faint)' },
  early: { label: 'Early close, 1 pm ET', color: 'var(--faint)' },
}

const DAY = 86400000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
/** Monday of the week that contains this date. */
const monday = (d: string) => {
  const t = new Date(`${d}T12:00:00Z`)
  const dow = (t.getUTCDay() + 6) % 7
  return iso(t.getTime() - dow * DAY)
}

export function CalendarPage() {
  return (
    <NeedsSignals>
      <Calendar />
    </NeedsSignals>
  )
}

function Calendar() {
  const { signals, positions, watchlist } = useAppState()
  const [scope, setScope] = useState<'all' | 'mine'>('all')
  const today = iso(Date.now())
  const until = iso(Date.now() + 42 * DAY)
  const held = new Set(positions.filter((p) => !p.closed).map((p) => p.symbol))
  const watched = new Set(watchlist.map((w) => w.symbol))
  const mineOf = (s?: string | null) => (s && held.has(s) ? 'holding' : s && watched.has(s) ? 'watching' : undefined)

  const events: Ev[] = []
  for (const r of signals!.recommendations) {
    const e = r.plan?.earnings
    if (!e || e.date < today || e.date > until) continue
    events.push({
      date: e.date,
      kind: 'earnings',
      title: r.symbol,
      detail: `${prettyName(r.name)}${e.hour === 'bmo' ? ', before the open' : e.hour === 'amc' ? ', after the close' : ''}`,
      mine: mineOf(r.symbol),
      symbol: r.symbol,
      ranked: true,
      color: RATING_META[r.rating].color,
    })
  }
  for (const i of signals!.ipos?.items ?? []) {
    if (i.date >= today && i.date <= until) events.push({ date: i.date, kind: 'ipo', title: i.symbol ?? prettyName(i.name), detail: `${prettyName(i.name)}${i.exchange ? ` on ${i.exchange}` : ''}`, symbol: i.symbol ?? undefined, mine: mineOf(i.symbol) })
    if (i.lockupDate >= today && i.lockupDate <= until && i.date <= today)
      events.push({ date: i.lockupDate, kind: 'lockup', title: i.symbol ?? prettyName(i.name), detail: 'Early investors may start selling', symbol: i.symbol ?? undefined, mine: mineOf(i.symbol), ranked: !!i.ranking })
  }
  for (const m of marketEvents(today, until)) events.push({ date: m.date, kind: m.kind, title: m.name, detail: m.kind === 'holiday' ? 'NYSE and Nasdaq closed' : 'Stocks close at 1:00 pm New York time' })

  const shown = events.filter((e) => scope === 'all' || e.mine || e.kind === 'holiday' || e.kind === 'early').sort((a, b) => a.date.localeCompare(b.date) || Number(!!b.mine) - Number(!!a.mine))
  const weeks = new Map<string, Ev[]>()
  for (const e of shown) weeks.set(monday(e.date), [...(weeks.get(monday(e.date)) ?? []), e])
  const thisMonday = monday(today)
  const weekTitle = (m: string) => {
    if (m === thisMonday) return 'This week'
    if (m === iso(new Date(`${thisMonday}T12:00:00Z`).getTime() + 7 * DAY)) return 'Next week'
    return `Week of ${new Date(`${m}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`
  }
  const mineCount = events.filter((e) => e.mine).length

  return (
    <main className="page">
      <PageHead title="Calendar" sub="The next six weeks: earnings of ranked stocks, IPOs, lock-up expiries and market holidays. Reports and lock-ups are when prices gap, sometimes straight past a stop.">
        <div style={{ width: 260 }}>
          <SegmentedControl
            options={[
              { value: 'all', label: 'Everything' },
              { value: 'mine', label: `Mine (${mineCount})` },
            ]}
            value={scope}
            onChange={(v) => setScope(v as 'all' | 'mine')}
            height={30}
            fontSize={14}
          />
        </div>
      </PageHead>

      {weeks.size === 0 && (
        <Card padding={24}>
          <div className="t-sub">{scope === 'mine' ? 'Nothing coming up for stocks you hold or watch.' : 'Nothing on the calendar for the next six weeks.'}</div>
        </Card>
      )}

      {[...weeks.entries()].map(([m, list]) => (
        <section key={m}>
          <div className="t-headline" style={{ marginBottom: 10 }}>
            {weekTitle(m)}
          </div>
          <Card padding={8}>
            {groupByDay(list).map(([day, evs], gi, all) => (
              <div key={day} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr)', gap: 8, padding: '6px 10px', borderBottom: gi < all.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                <div style={{ paddingTop: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: day === today ? 'var(--info)' : 'var(--text)' }}>{['Today', 'Tomorrow'].includes(dayLabel(day)) ? dayLabel(day) : new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })}</div>
                  <div className="t-caption">{new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</div>
                </div>
                <div>
                  {evs.map((e, i) => (
                    <EventRow key={`${e.kind}-${e.title}-${i}`} e={e} />
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </section>
      ))}
    </main>
  )
}

function groupByDay(list: Ev[]): [string, Ev[]][] {
  const m = new Map<string, Ev[]>()
  for (const e of list) m.set(e.date, [...(m.get(e.date) ?? []), e])
  return [...m.entries()]
}

function EventRow({ e }: { e: Ev }) {
  const dispatch = useAppDispatch()
  const k = KIND[e.kind]
  const clickable = (e.kind === 'earnings' || (e.kind === 'lockup' && e.ranked)) && e.symbol
  const toHot = (e.kind === 'ipo' || e.kind === 'lockup') && e.symbol && !clickable
  return (
    <button
      className="tap row"
      disabled={!clickable && !toHot}
      onClick={() => {
        if (clickable) dispatch({ type: 'OPEN_STOCK', symbol: e.symbol! })
        else if (toHot) {
          dispatch({ type: 'SELECT_HOT', symbol: e.symbol! })
          dispatch({ type: 'SET_VIEW', view: 'hot' })
        }
      }}
      style={{ width: '100%', display: 'grid', gridTemplateColumns: '10px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: '9px 8px', border: 'none', borderRadius: 10, background: 'transparent', color: 'var(--text)', textAlign: 'left', cursor: clickable || toHot ? 'pointer' : 'default' }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: k.color }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <b style={{ fontWeight: 600 }}>{e.title}</b> <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>{k.label}</span>
        </span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.detail}</span>
      </span>
      {e.mine && <span style={{ fontSize: 12.5, fontWeight: 600, color: e.mine === 'holding' ? 'var(--info)' : 'var(--warn)', background: e.mine === 'holding' ? 'var(--infosoft)' : 'var(--warnsoft)', borderRadius: 999, padding: '3px 10px' }}>{e.mine === 'holding' ? 'You hold' : 'Watching'}</span>}
    </button>
  )
}
