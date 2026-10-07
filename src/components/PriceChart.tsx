import { useEffect, useMemo, useRef, useState } from 'react'
import { SegmentedControl } from '../ui/Primitives'
import { useAppDispatch, useAppState, type Tick } from '../state/store'
import type { Bar, ChartRange, Intraday } from '../types'
import { sessionOf } from '../utils/marketClock'
import { MarketClock } from './MarketClock'
import { formatDate, formatHM, formatPrice } from '../utils/format'
import { CHART_FONT, cssVar, hexToRgba } from '../utils/canvas'

const RANGES: ChartRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y']
const BARS: Record<Exclude<ChartRange, '1D' | '1W'>, number> = { '1M': 21, '3M': 63, '6M': 126, '1Y': 260 }
/** Smallest number of points a zoom can show. */
const MIN_WINDOW = 8

type MaKey = 'sma20' | 'sma50' | 'sma200'

interface Pt {
  t: number
  p: number
  sma20?: number | null
  sma50?: number | null
  sma200?: number | null
}

function rollingMean(values: number[], n: number): (number | null)[] {
  let sum = 0
  return values.map((v, i) => {
    sum += v
    if (i >= n) sum -= values[i - n]
    return i >= n - 1 ? sum / n : null
  })
}

function withAverages(points: Pt[]): Pt[] {
  const vals = points.map((p) => p.p)
  const a20 = rollingMean(vals, 20)
  const a50 = rollingMean(vals, 50)
  const a200 = rollingMean(vals, 200)
  return points.map((pt, i) => ({ ...pt, sma20: a20[i], sma50: a50[i], sma200: a200[i] }))
}

/** Moving-average overlays: CSS token, dash pattern, legend label. */
const MA_STYLE: Record<MaKey, { color: string; dash: number[]; label: string }> = {
  sma20: { color: '--info', dash: [2, 3], label: '20-day' },
  sma50: { color: '--muted', dash: [5, 4], label: '50-day' },
  sma200: { color: '--warn', dash: [9, 4], label: '200-day' },
}

function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

const DAY_MS = 86400000
const dayKey = (t: number) => new Date(t).toDateString()
const monthKey = (t: number) => {
  const d = new Date(t)
  return d.getFullYear() * 12 + d.getMonth()
}
/** Monday-based week number, good enough to detect a new week. */
const weekKey = (t: number) => {
  const d = new Date(t)
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  return monday.toDateString()
}

/**
 * Pick x-axis ticks at natural boundaries for the visible span:
 * hours within a day, days within ~2 weeks, weeks within ~3 months, months within ~2 years, then years.
 */
function timeTicks(points: { t: number }[], maxLabels: number): { i: number; label: string }[] {
  if (points.length < 2) return []
  const span = points[points.length - 1].t - points[0].t
  const hm = (t: number) => formatHM(t)
  const wd = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' })
  const dm = (t: number) => formatDate(t)
  const mon = (t: number, withYear: boolean) =>
    new Date(t).toLocaleDateString('en-GB', withYear ? { month: 'short', year: '2-digit' } : { month: 'short' })
  const yr = (t: number) => String(new Date(t).getFullYear())

  let key: (t: number) => string | number
  let fmt: (t: number, i: number, prevT: number | null) => string
  if (span <= 1.5 * DAY_MS) {
    key = (t) => Math.floor(t / 3600000) // every hour, thinned below
    fmt = (t) => hm(t)
  } else if (span <= 16 * DAY_MS) {
    key = dayKey
    fmt = (t) => wd(t)
  } else if (span <= 100 * DAY_MS) {
    key = weekKey
    fmt = (t) => dm(t)
  } else if (span <= 2.2 * 365 * DAY_MS) {
    key = monthKey
    fmt = (t, _i, prevT) => mon(t, prevT == null || new Date(prevT).getFullYear() !== new Date(t).getFullYear())
  } else {
    key = (t) => new Date(t).getFullYear()
    fmt = (t) => yr(t)
  }

  // indices where a new unit starts
  const starts: number[] = []
  for (let i = 1; i < points.length; i++) if (key(points[i].t) !== key(points[i - 1].t)) starts.push(i)
  if (starts.length === 0) {
    // the whole view sits inside one unit: label both ends
    return [0, points.length - 1].map((i) => ({ i, label: span <= 1.5 * DAY_MS ? hm(points[i].t) : dm(points[i].t) }))
  }
  const step = Math.max(1, Math.ceil(starts.length / maxLabels))
  const picked = starts.filter((_, k) => k % step === 0)
  let prevT: number | null = null
  return picked.map((i) => {
    const label = fmt(points[i].t, i, prevT)
    prevT = points[i].t
    return { i, label }
  })
}

export interface ChartLevel {
  price: number
  label: string
  /** CSS custom property name, e.g. '--up' */
  color: string
}

export function PriceChart({
  symbol,
  history,
  livePrice,
  liveTs,
  levels = [],
  intraday,
}: {
  symbol: string
  history: Bar[]
  livePrice?: number
  liveTs?: number
  levels?: ChartLevel[]
  /** today's 5 minute bars incl. pre-market / after-hours */
  intraday?: Intraday
}) {
  const { range, theme, ticks, overlays } = useAppState()
  const dispatch = useAppDispatch()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)
  const symbolTicks: Tick[] = ticks[symbol] ?? []

  const intradayRange = range === '1D' || range === '1W'

  // Everything that can be shown for this range; the zoom window picks a slice of it.
  const allPoints = useMemo<Pt[]>(() => {
    if (range === '1D' || range === '1W') {
      // 1D: today's 5 minute bars, 1W: last 5 days in 30 minute bars; both extended with live ticks
      const src = range === '1D' ? intraday?.bars : intraday?.week
      let bars: Pt[] = (src ?? []).map(([t, p]) => ({ t: t * 1000, p }))
      if (range === '1W' && bars.length === 0) bars = history.slice(-6).map(([t, p]) => ({ t: t * 1000, p }))
      const lastBar = bars.length ? bars[bars.length - 1].t : 0
      const fresh = symbolTicks.filter((t) => t.t > lastBar).map((t) => ({ t: t.t, p: t.p }))
      // keep the week view light: one live point is enough there
      return range === '1W' ? [...bars, ...fresh.slice(-1)] : [...bars, ...fresh]
    }
    let daily: Pt[] = history.map(([t, p]) => ({ t: t * 1000, p }))
    if (livePrice && liveTs && daily.length) {
      const last = daily[daily.length - 1]
      if (sameDay(last.t, liveTs)) daily = [...daily.slice(0, -1), { t: liveTs, p: livePrice }]
      else if (liveTs > last.t) daily = [...daily, { t: liveTs, p: livePrice }]
    }
    return withAverages(daily)
  }, [range, history, livePrice, liveTs, symbolTicks, intraday])

  // Zoom window as fractional [from, to] indices into allPoints; null = the range's default view.
  // Fractions let small pinch steps accumulate smoothly instead of being rounded away.
  const [zoom, setZoom] = useState<[number, number] | null>(null)
  // A range switch caused by zooming keeps the zoom window; a click on a range button resets it.
  const keepZoom = useRef(false)
  useEffect(() => {
    if (keepZoom.current) {
      keepZoom.current = false
      return
    }
    setZoom(null)
  }, [range, symbol])
  const n = allPoints.length
  const defaultFrom = intradayRange ? 0 : Math.max(0, n - BARS[range as keyof typeof BARS])
  const from = zoom ? Math.max(0, Math.round(zoom[0])) : defaultFrom
  const to = zoom ? Math.min(n - 1, Math.round(zoom[1])) : n - 1
  const points = useMemo(() => allPoints.slice(from, to + 1), [allPoints, from, to])
  const zoomed = zoom !== null

  // On the daily ranges the range buttons follow the zoom: zoom out past 1M and it becomes 3M, and so on.
  useEffect(() => {
    if (!zoom || intradayRange) return
    const width = zoom[1] - zoom[0] + 1
    const daily: (keyof typeof BARS)[] = ['1M', '3M', '6M', '1Y']
    const target = daily.find((r) => BARS[r] >= width * 0.95) ?? '1Y'
    if (target !== range) {
      keepZoom.current = true
      dispatch({ type: 'SET_RANGE', range: target })
    }
  }, [zoom, range, intradayRange, dispatch])

  function clampWindow(a: number, width: number): [number, number] {
    const w = Math.min(n - 1, Math.max(MIN_WINDOW - 1, width))
    const start = Math.max(0, Math.min(a, n - 1 - w))
    return [start, start + w]
  }

  /** Zoom by factor around a 0..1 anchor of the visible window (factor < 1 zooms in). */
  // How far the user kept zooming out after the whole range was already visible.
  const overshoot = useRef(1)
  // ...and how far they kept zooming in at the smallest window.
  const undershoot = useRef(1)

  function zoomBy(factor: number, anchor = 0.5) {
    if (n < 2) return
    const atFull = to - from >= n - 1
    if (factor > 1 && atFull) {
      // Pinching out past the full 1D or 1W view moves up to the next range.
      undershoot.current = 1
      overshoot.current *= factor
      if (overshoot.current > 1.25) {
        overshoot.current = 1
        const next = RANGES[RANGES.indexOf(range) + 1]
        if (next && intradayRange) dispatch({ type: 'SET_RANGE', range: next })
      }
      return
    }
    // On 1W, about one trading day (13 half-hour bars) is close enough to hand over to 1D.
    const atMin = to - from <= (range === '1W' ? 13 : MIN_WINDOW - 1)
    if (factor < 1 && atMin) {
      // Pinching in past the closest daily view moves down to 1W, and past 1W to 1D.
      undershoot.current *= factor
      if (undershoot.current < 0.8) {
        undershoot.current = 1
        const down: ChartRange | null = range === '1W' ? '1D' : intradayRange ? null : '1W'
        if (down) dispatch({ type: 'SET_RANGE', range: down })
      }
      return
    }
    overshoot.current = 1
    undershoot.current = 1
    setZoom((prev) => {
      const [f, t] = prev ?? [defaultFrom, n - 1]
      const width = t - f
      const newWidth = Math.min(n - 1, Math.max(MIN_WINDOW - 1, width * factor))
      const center = f + width * anchor
      return clampWindow(center - newWidth * anchor, newWidth)
    })
  }
  function panBy(deltaPoints: number, base: [number, number]) {
    setZoom(clampWindow(base[0] + deltaPoints, base[1] - base[0]))
  }

  // Wheel / trackpad zoom needs a non-passive listener to stop the page from scrolling.
  // The zoom step follows the size of the scroll, so a pinch (many small events) zooms gently.
  const zoomRef = useRef(zoomBy)
  zoomRef.current = zoomBy
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const plotW = rect.width - 70
      const anchor = Math.min(1, Math.max(0, (e.clientX - rect.left - 8) / plotW))
      const delta = Math.max(-60, Math.min(60, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY))
      // macOS reports a trackpad pinch as a wheel event with ctrlKey set
      const sensitivity = e.ctrlKey ? 0.006 : 0.0015
      zoomRef.current(Math.exp(delta * sensitivity), anchor)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const drag = useRef<{ x: number; base: [number, number]; moved: boolean } | null>(null)

  const loaded = points.length >= 2
  const first = loaded ? points[0].p : 0
  const last = loaded ? points[points.length - 1].p : 0
  const gain = last >= first

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current
      const wrapper = wrapperRef.current
      if (!canvas || !wrapper) return
      const rect = wrapper.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      if (points.length < 2) return

      const left = 8
      const right = rect.width - 62
      const top = 14
      const bottom = rect.height - 26
      const plotW = right - left
      const plotH = bottom - top

      const daily = !intradayRange
      const shownLevels = range !== '1D' && overlays.levels ? levels : []
      const shownMas = daily ? (Object.keys(MA_STYLE) as MaKey[]).filter((k) => overlays[k]) : []
      const values = [
        ...points.flatMap((p) => [p.p, ...shownMas.map((k) => p[k]).filter((v): v is number => v != null)]),
        ...shownLevels.map((l) => l.price),
        ...(range === '1D' && intraday?.prevClose ? [intraday.prevClose] : []),
      ]
      const min = Math.min(...values)
      const max = Math.max(...values)
      const span = max - min || max * 0.01 || 1
      const padMin = min - span * 0.1
      const padMax = max + span * 0.1
      const domain = padMax - padMin || 1
      const xAt = (i: number) => left + (i / (points.length - 1)) * plotW
      const yAt = (p: number) => top + (1 - (p - padMin) / domain) * plotH

      const faint = cssVar('--faint')
      const grid = cssVar('--grid')
      const surface = cssVar('--surface')
      const text = cssVar('--text')
      const lineColor = gain ? cssVar('--up') : cssVar('--down')

      // shade pre-market and after-hours on the intraday view (x is by index, so shade bar runs)
      if (range === '1D' && intraday?.periods) {
        const runs: { from: number; to: number; s: string }[] = []
        points.forEach((pt, i) => {
          const sess = sessionOf(pt.t, intraday.periods)
          const last = runs[runs.length - 1]
          if (last && last.s === sess) last.to = i
          else runs.push({ from: i, to: i, s: sess })
        })
        for (const r of runs) {
          if (r.s !== 'pre' && r.s !== 'post') continue
          const x0 = xAt(Math.max(0, r.from - 0.5))
          const x1 = xAt(Math.min(points.length - 1, r.to + 0.5))
          ctx.fillStyle = hexToRgba(cssVar(r.s === 'pre' ? '--info' : '--warn'), 0.07)
          ctx.fillRect(x0, top, x1 - x0, plotH)
          ctx.fillStyle = hexToRgba(cssVar(r.s === 'pre' ? '--info' : '--warn'), 0.8)
          ctx.font = `600 10px ${CHART_FONT}`
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          if (x1 - x0 > 60) ctx.fillText(r.s === 'pre' ? 'PRE-MARKET' : 'AFTER HOURS', x0 + 6, top + 4)
        }
        // previous close reference line
        if (intraday.prevClose) {
          const y = yAt(intraday.prevClose)
          if (y > top && y < bottom) {
            ctx.save()
            ctx.setLineDash([2, 4])
            ctx.strokeStyle = cssVar('--faint')
            ctx.beginPath()
            ctx.moveTo(left, y)
            ctx.lineTo(right, y)
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      ctx.strokeStyle = grid
      ctx.lineWidth = 1
      ctx.font = `11px ${CHART_FONT}`
      ctx.fillStyle = faint
      ctx.textBaseline = 'middle'
      for (let i = 0; i < 5; i++) {
        const y = top + (i / 4) * plotH
        ctx.beginPath()
        ctx.moveTo(left, y)
        ctx.lineTo(right, y)
        ctx.stroke()
        ctx.textAlign = 'left'
        ctx.fillText((padMax - (i / 4) * domain).toFixed(2), right + 6, y)
      }
      ctx.textBaseline = 'top'
      ctx.textAlign = 'center'
      // x axis: tick unit follows the visible time span (minutes, days, weeks, months, years)
      const ticks = timeTicks(points, Math.max(2, Math.floor(plotW / 86)))
      for (const tk of ticks) {
        const x = xAt(tk.i)
        ctx.save()
        ctx.strokeStyle = grid
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
        ctx.restore()
        const lx = Math.min(Math.max(x, left + 24), right - 24)
        ctx.fillText(tk.label, lx, bottom + 8)
      }

      // area + line
      const gradient = ctx.createLinearGradient(0, top, 0, bottom)
      gradient.addColorStop(0, hexToRgba(lineColor, 0.22))
      gradient.addColorStop(1, hexToRgba(lineColor, 0))
      ctx.beginPath()
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(xAt(i), yAt(p.p)) : ctx.lineTo(xAt(i), yAt(p.p))))
      ctx.lineTo(right, bottom)
      ctx.lineTo(left, bottom)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.beginPath()
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(xAt(i), yAt(p.p)) : ctx.lineTo(xAt(i), yAt(p.p))))
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 1.8
      ctx.lineJoin = 'round'
      ctx.stroke()

      // moving averages
      for (const k of shownMas) {
        const st = MA_STYLE[k]
        ctx.save()
        ctx.setLineDash(st.dash)
        ctx.strokeStyle = cssVar(st.color)
        ctx.lineWidth = 1.3
        ctx.beginPath()
        let started = false
        points.forEach((p, i) => {
          const v = p[k]
          if (v == null) return
          if (!started) {
            ctx.moveTo(xAt(i), yAt(v))
            started = true
          } else ctx.lineTo(xAt(i), yAt(v))
        })
        ctx.stroke()
        ctx.restore()
      }

      // plan levels (entry, stop, targets)
      for (const lv of shownLevels) {
        const ly = yAt(lv.price)
        const c = cssVar(lv.color)
        ctx.save()
        ctx.setLineDash([6, 4])
        ctx.strokeStyle = hexToRgba(c, 0.85)
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(left, ly)
        ctx.lineTo(right, ly)
        ctx.stroke()
        ctx.restore()
        ctx.font = `600 11px ${CHART_FONT}`
        const txt = `${lv.label} ${lv.price.toFixed(2)}`
        const w = ctx.measureText(txt).width + 14
        // opaque label so the dashed line never runs through the text
        ctx.fillStyle = surface
        ctx.beginPath()
        ctx.roundRect(left + 4, ly - 10, w, 20, 6)
        ctx.fill()
        ctx.fillStyle = hexToRgba(c, 0.14)
        ctx.fill()
        ctx.fillStyle = c
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(txt, left + 11, ly + 0.5)
      }
      ctx.font = `11px ${CHART_FONT}`

      // last price rule + dot
      const lastY = yAt(last)
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = lineColor
      ctx.beginPath()
      ctx.moveTo(left, lastY)
      ctx.lineTo(right, lastY)
      ctx.stroke()
      ctx.restore()
      ctx.beginPath()
      ctx.fillStyle = lineColor
      ctx.arc(xAt(points.length - 1), lastY, 3.5, 0, Math.PI * 2)
      ctx.fill()

      if (hoverX !== null) {
        const clamped = Math.min(Math.max(hoverX, left), right)
        const idx = Math.min(Math.max(Math.round(((clamped - left) / plotW) * (points.length - 1)), 0), points.length - 1)
        const pt = points[idx]
        const x = xAt(idx)
        const y = yAt(pt.p)
        ctx.strokeStyle = grid
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
        ctx.beginPath()
        ctx.fillStyle = surface
        ctx.strokeStyle = lineColor
        ctx.lineWidth = 2
        ctx.arc(x, y, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        const when =
          range === '1D'
            ? new Date(pt.t).toLocaleTimeString('en-GB', { hour12: false })
            : range === '1W'
              ? new Date(pt.t).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
            : new Date(pt.t).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        const mas = shownMas.map((k) => (pt[k] != null ? `   ${MA_STYLE[k].label} ${pt[k]!.toFixed(2)}` : '')).join('')
        const label = `${formatPrice(pt.p)}   ${when}${mas}`
        const pillW = ctx.measureText(label).width + 20
        const pillH = 22
        const pillX = Math.min(Math.max(x - pillW / 2, left), right - pillW)
        ctx.beginPath()
        ctx.roundRect(pillX, top, pillW, pillH, 6)
        ctx.fillStyle = surface
        ctx.fill()
        ctx.strokeStyle = grid
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = text
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, pillX + pillW / 2, top + pillH / 2 + 1)
      }
    }

    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [points, hoverX, theme, gain, last, range, levels, overlays, intraday, intradayRange])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 280px', maxWidth: 360 }}>
          <SegmentedControl options={RANGES.map((r) => ({ value: r, label: r }))} value={range} onChange={(r) => dispatch({ type: 'SET_RANGE', range: r })} height={28} fontSize={13} />
        </div>
        <div className="hide-sm">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {zoomed && <ZoomBtn label="Reset" title="Back to the full range (or double-click the chart)" onClick={() => setZoom(null)} />}
          <ZoomBtn label="−" title="Zoom out" onClick={() => zoomBy(1.5)} disabled={!loaded || (to - from >= n - 1 && !intradayRange)} />
          <ZoomBtn label="+" title="Zoom in (or scroll on the chart)" onClick={() => zoomBy(0.66)} disabled={!loaded || (to - from <= MIN_WINDOW - 1 && range === '1D')} />
          </div>
        </div>
      </div>
      {range === '1D' && (
        <div style={{ marginBottom: 10 }}>
          <MarketClock />
        </div>
      )}
      <div
        ref={wrapperRef}
        style={{ position: 'relative', width: '100%', height: 320, userSelect: 'none' }}
        onMouseDown={(e) => {
          drag.current = { x: e.clientX, base: zoom ?? [from, to], moved: false }
        }}
        onMouseMove={(e) => {
          const rect = wrapperRef.current?.getBoundingClientRect()
          if (!rect) return
          const d = drag.current
          if (d) {
            const dx = e.clientX - d.x
            if (Math.abs(dx) > 3) d.moved = true
            if (d.moved) {
              const plotW = rect.width - 70
              panBy((-dx / plotW) * (d.base[1] - d.base[0]), d.base)
              setHoverX(null)
              return
            }
          }
          setHoverX(e.clientX - rect.left)
        }}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => {
          drag.current = null
          setHoverX(null)
        }}
        onDoubleClick={() => setZoom(null)}
      >
        <canvas ref={canvasRef} style={{ cursor: drag.current?.moved ? 'grabbing' : zoomed ? 'grab' : 'crosshair', display: 'block' }} />
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
            {intradayRange
              ? 'No intraday data for this stock yet. It comes with the next data refresh; live ticks need a Finnhub key in Settings.'
              : 'No price history for this range.'}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Legend color={gain ? 'var(--up)' : 'var(--down)'} label="Price" />
          {range === '1D' && intraday?.prevClose && <Legend color="var(--faint)" label={`Prev close ${intraday.prevClose.toFixed(2)}`} />}
          {!intradayRange &&
            (Object.keys(MA_STYLE) as MaKey[]).map((k) => (
              <Toggle key={k} on={overlays[k]} onClick={() => dispatch({ type: 'TOGGLE_OVERLAY', overlay: k })} color={`var(${MA_STYLE[k].color})`} dashed label={`${MA_STYLE[k].label} avg`} />
            ))}
          {range !== '1D' && levels.length > 0 && (
            <Toggle on={overlays.levels} onClick={() => dispatch({ type: 'TOGGLE_OVERLAY', overlay: 'levels' })} color="var(--info)" dashed label="Plan levels" />
          )}
        </div>
        {loaded && (
          <div className="hide-sm t-caption">{zoomed ? `${points.length} of ${n} points · drag to pan · double-click to reset` : 'Scroll or pinch on the chart to zoom'}</div>
        )}
      </div>
    </div>
  )
}

function ZoomBtn({ label, title, onClick, disabled }: { label: string; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="tap"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      style={{
        minWidth: 32,
        height: 32,
        padding: '0 10px',
        borderRadius: 999,
        border: 'none',
        background: 'var(--seg-track)',
        color: disabled ? 'var(--faint)' : 'var(--text)',
        fontSize: label.length > 1 ? 13 : 17,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', marginRight: 6 }}>
      <span style={{ width: 16, borderTop: `2px solid ${color}` }} />
      {label}
    </span>
  )
}

/** Chart overlay filter chip. */
function Toggle({ on, onClick, color, label, dashed }: { on: boolean; onClick: () => void; color: string; label: string; dashed?: boolean }) {
  return (
    <button className="tap"
      onClick={onClick}
      aria-pressed={on}
      title={on ? `Hide ${label}` : `Show ${label}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 11px',
        borderRadius: 999,
        border: 'none',
        background: on ? 'var(--seg-track)' : 'transparent',
        color: on ? 'var(--text)' : 'var(--faint)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      <span style={{ width: 14, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${on ? color : 'var(--border2)'}` }} />
      {label}
    </button>
  )
}
