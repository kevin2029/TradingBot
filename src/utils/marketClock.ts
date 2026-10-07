// US stock market (NYSE/Nasdaq) session clock, computed in America/New_York time.
// Sessions: pre-market 04:00-09:30, regular 09:30-16:00, after-hours 16:00-20:00 ET.

export type Session = 'pre' | 'regular' | 'post' | 'closed'

// NYSE full-day holidays (yyyy-mm-dd) and 1:00 pm early closes, from the NYSE 2026-2028 calendar.
const HOLIDAYS = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
  '2028-01-17', '2028-02-21', '2028-04-14', '2028-05-29', '2028-06-19', '2028-07-04', '2028-09-04', '2028-11-23', '2028-12-25',
])
const EARLY_CLOSE = new Set(['2026-11-27', '2026-12-24', '2027-11-26', '2028-07-03', '2028-11-24'])

const NY = 'America/New_York'
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: NY,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function nyParts(ms: number) {
  const parts = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((p) => [p.type, p.value]))
  return { y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour, min: +parts.minute, s: +parts.second }
}

/** UTC ms for a wall-clock time in New York (handles DST). */
function nyTime(y: number, m: number, d: number, h: number, min: number): number {
  let guess = Date.UTC(y, m - 1, d, h, min)
  for (let i = 0; i < 2; i++) {
    const p = nyParts(guess)
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min)
    guess += Date.UTC(y, m - 1, d, h, min) - asUtc
  }
  return guess
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export function isTradingDay(y: number, m: number, d: number) {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return dow !== 0 && dow !== 6 && !HOLIDAYS.has(iso(y, m, d))
}

interface DayTimes {
  date: string
  preStart: number
  open: number
  close: number
  postEnd: number
  early: boolean
}

function dayTimes(y: number, m: number, d: number): DayTimes {
  const early = EARLY_CLOSE.has(iso(y, m, d))
  return {
    date: iso(y, m, d),
    preStart: nyTime(y, m, d, 4, 0),
    open: nyTime(y, m, d, 9, 30),
    close: nyTime(y, m, d, early ? 13 : 16, 0),
    postEnd: nyTime(y, m, d, early ? 17 : 20, 0),
    early,
  }
}

/** Trading days starting from the NY calendar day of `now`. */
function tradingDays(now: number, count: number): DayTimes[] {
  const p = nyParts(now)
  const out: DayTimes[] = []
  for (let i = 0; out.length < count && i < 15; i++) {
    const dt = new Date(Date.UTC(p.y, p.m - 1, p.d + i))
    const y = dt.getUTCFullYear()
    const m = dt.getUTCMonth() + 1
    const d = dt.getUTCDate()
    if (isTradingDay(y, m, d)) out.push(dayTimes(y, m, d))
  }
  return out
}

export interface ClockState {
  session: Session
  label: string
  /** the next thing that happens, e.g. "Opens" at a time */
  next: { label: string; at: number }
  /** today's regular open/close if today is a trading day */
  today: DayTimes | null
  earlyClose: boolean
  holiday: boolean
}

export function marketClock(now = Date.now()): ClockState {
  const p = nyParts(now)
  const todayIsTrading = isTradingDay(p.y, p.m, p.d)
  const days = tradingDays(now, 2)
  const today = todayIsTrading ? days[0] : null
  const nextDay = todayIsTrading ? days[1] : days[0]
  const dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()
  const holiday = !todayIsTrading && dow !== 0 && dow !== 6

  if (today) {
    if (now < today.preStart) return { session: 'closed', label: 'Closed', next: { label: 'Pre-market starts', at: today.preStart }, today, earlyClose: today.early, holiday }
    if (now < today.open) return { session: 'pre', label: 'Pre-market', next: { label: 'Opens', at: today.open }, today, earlyClose: today.early, holiday }
    if (now < today.close) return { session: 'regular', label: 'Market open', next: { label: today.early ? 'Closes early' : 'Closes', at: today.close }, today, earlyClose: today.early, holiday }
    if (now < today.postEnd) return { session: 'post', label: 'After hours', next: { label: 'After hours end', at: today.postEnd }, today, earlyClose: today.early, holiday }
  }
  return {
    session: 'closed',
    label: holiday ? 'Closed (holiday)' : 'Closed',
    next: { label: 'Opens', at: nextDay ? nextDay.open : now },
    today,
    earlyClose: false,
    holiday,
  }
}

/** "2h 05m", "4m 12s", "3d 2h" */
export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(sec).padStart(2, '0')}s`
}

/** Local time (the viewer's timezone) and day if not today, e.g. "15:30" or "Mon 15:30". */
export function formatLocal(at: number) {
  const d = new Date(at)
  const sameDay = d.toDateString() === new Date().toDateString()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  return sameDay ? time : `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${time}`
}

export function sessionOf(tsMs: number, periods?: { pre: [number, number] | null; regular: [number, number] | null; post: [number, number] | null }): Session {
  const t = tsMs / 1000
  if (periods?.pre && t >= periods.pre[0] && t < periods.pre[1]) return 'pre'
  if (periods?.regular && t >= periods.regular[0] && t < periods.regular[1]) return 'regular'
  if (periods?.post && t >= periods.post[0] && t < periods.post[1]) return 'post'
  return 'closed'
}

/** NYSE closed days and early closes in a date range, with their names. */
export function marketEvents(fromIso: string, toIso: string): { date: string; kind: 'holiday' | 'early'; name: string }[] {
  const name = (d: string, early: boolean) => {
    const m = Number(d.slice(5, 7))
    if (early) return m === 11 ? 'Day after Thanksgiving' : m === 12 ? 'Christmas Eve' : 'Day before Independence Day'
    return ({ 1: d.slice(8) === '01' ? "New Year's Day" : 'Martin Luther King Jr. Day', 2: "Presidents' Day", 3: 'Good Friday', 4: 'Good Friday', 5: 'Memorial Day', 6: 'Juneteenth', 7: 'Independence Day', 9: 'Labor Day', 11: 'Thanksgiving', 12: 'Christmas' } as Record<number, string>)[m] ?? 'Holiday'
  }
  const out: { date: string; kind: 'holiday' | 'early'; name: string }[] = []
  for (const d of HOLIDAYS) if (d >= fromIso && d <= toIso) out.push({ date: d, kind: 'holiday', name: name(d, false) })
  for (const d of EARLY_CLOSE) if (d >= fromIso && d <= toIso) out.push({ date: d, kind: 'early', name: name(d, true) })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
