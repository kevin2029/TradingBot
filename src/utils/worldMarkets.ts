// Opening hours of popular stock exchanges, evaluated in each exchange's own timezone.
// Regular sessions only. Weekends are handled; holidays only for New York (NYSE calendar).
import { isTradingDay as nyseTradingDay, marketClock } from './marketClock'

export interface Exchange {
  code: string
  city: string
  name: string
  tz: string
  /** local [startH, startM, endH, endM]; two entries when there is a lunch break */
  sessions: [number, number, number, number][]
}

export const EXCHANGES: Exchange[] = [
  { code: 'NYC', city: 'New York', name: 'NYSE / Nasdaq', tz: 'America/New_York', sessions: [[9, 30, 16, 0]] },
  { code: 'LON', city: 'London', name: 'London Stock Exchange', tz: 'Europe/London', sessions: [[8, 0, 16, 30]] },
  { code: 'AMS', city: 'Amsterdam', name: 'Euronext Amsterdam', tz: 'Europe/Amsterdam', sessions: [[9, 0, 17, 30]] },
  { code: 'FRA', city: 'Frankfurt', name: 'Xetra', tz: 'Europe/Berlin', sessions: [[9, 0, 17, 30]] },
  { code: 'TYO', city: 'Tokyo', name: 'Tokyo Stock Exchange', tz: 'Asia/Tokyo', sessions: [[9, 0, 11, 30], [12, 30, 15, 30]] },
  { code: 'HKG', city: 'Hong Kong', name: 'HKEX', tz: 'Asia/Hong_Kong', sessions: [[9, 30, 12, 0], [13, 0, 16, 0]] },
  { code: 'SHA', city: 'Shanghai', name: 'Shanghai Stock Exchange', tz: 'Asia/Shanghai', sessions: [[9, 30, 11, 30], [13, 0, 15, 0]] },
  { code: 'SYD', city: 'Sydney', name: 'ASX', tz: 'Australia/Sydney', sessions: [[10, 0, 16, 0]] },
]

const formatters = new Map<string, Intl.DateTimeFormat>()
function parts(ms: number, tz: string) {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    formatters.set(tz, f)
  }
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute }
}

/** UTC ms of a wall-clock time in a timezone (DST aware). */
function zoned(tz: string, y: number, m: number, d: number, h: number, min: number) {
  const target = Date.UTC(y, m - 1, d, h, min)
  let guess = target
  for (let i = 0; i < 2; i++) {
    const p = parts(guess, tz)
    guess += target - Date.UTC(p.y, p.m - 1, p.d, p.h, p.min)
  }
  return guess
}

export type ExchangeState = 'open' | 'break' | 'closed'

export interface ExchangeStatus {
  ex: Exchange
  state: ExchangeState
  /** next open (when closed or on break) or close (when open) */
  nextAt: number
  /** local wall time at the exchange, e.g. "09:42" */
  localTime: string
  /** today's first open and last close in UTC ms, when today is a trading day */
  todayOpen: number | null
  todayClose: number | null
}

function tradingDay(ex: Exchange, y: number, m: number, d: number) {
  if (ex.tz === 'America/New_York') return nyseTradingDay(y, m, d)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return dow !== 0 && dow !== 6
}

export function exchangeStatus(ex: Exchange, now = Date.now()): ExchangeStatus {
  const p = parts(now, ex.tz)
  const localTime = `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`
  // collect session windows for today and the next 10 days
  const windows: { open: number; close: number; day: number }[] = []
  for (let i = 0; i < 11; i++) {
    const dt = new Date(Date.UTC(p.y, p.m - 1, p.d + i))
    const y = dt.getUTCFullYear()
    const m = dt.getUTCMonth() + 1
    const d = dt.getUTCDate()
    if (!tradingDay(ex, y, m, d)) continue
    let sessions = ex.sessions
    // NYSE early closes (1:00 pm)
    if (ex.tz === 'America/New_York' && i === 0 && marketClock(now).earlyClose) sessions = [[9, 30, 13, 0]]
    for (const [sh, sm, eh, em] of sessions) windows.push({ open: zoned(ex.tz, y, m, d, sh, sm), close: zoned(ex.tz, y, m, d, eh, em), day: i })
  }
  const today = windows.filter((w) => w.day === 0)
  const todayOpen = today.length ? today[0].open : null
  const todayClose = today.length ? today[today.length - 1].close : null

  const current = windows.find((w) => now >= w.open && now < w.close)
  if (current) return { ex, state: 'open', nextAt: current.close, localTime, todayOpen, todayClose }
  const next = windows.find((w) => w.open > now)
  const onBreak = !!next && next.day === 0 && today.some((w) => w.close <= now)
  return { ex, state: onBreak ? 'break' : 'closed', nextAt: next ? next.open : now, localTime, todayOpen, todayClose }
}
