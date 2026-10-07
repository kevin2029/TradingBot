import { useEffect, useMemo, useRef, useState } from 'react'
import { SegmentedControl } from '../ui/Primitives'
import { useAppDispatch, useAppState, type Tick } from '../state/store'
import type { Bar, ChartRange } from '../types'
import { formatDate, formatHM, formatPrice } from '../utils/format'
import { cssVar, hexToRgba } from '../utils/canvas'

const RANGES: ChartRange[] = ['1D', '1M', '3M', '6M', '1Y']
const BARS: Record<Exclude<ChartRange, '1D'>, number> = { '1M': 21, '3M': 63, '6M': 126, '1Y': 260 }

interface Pt {
  t: number
  p: number
  ma?: number | null
}

function withSma(points: Pt[], n: number): Pt[] {
  let sum = 0
  return points.map((pt, i) => {
    sum += pt.p
    if (i >= n) sum -= points[i - n].p
    return { ...pt, ma: i >= n - 1 ? sum / n : null }
  })
}

function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export function PriceChart({ symbol, history, livePrice, liveTs }: { symbol: string; history: Bar[]; livePrice?: number; liveTs?: number }) {
  const { range, theme, ticks } = useAppState()
  const dispatch = useAppDispatch()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)
  const symbolTicks: Tick[] = ticks[symbol] ?? []

  const points = useMemo<Pt[]>(() => {
    if (range === '1D') return symbolTicks.map((t) => ({ t: t.t, p: t.p }))
    let daily: Pt[] = history.map(([t, p]) => ({ t: t * 1000, p }))
    if (livePrice && liveTs && daily.length) {
      const last = daily[daily.length - 1]
      if (sameDay(last.t, liveTs)) daily = [...daily.slice(0, -1), { t: liveTs, p: livePrice }]
      else if (liveTs > last.t) daily = [...daily, { t: liveTs, p: livePrice }]
    }
    return withSma(daily, 50).slice(-BARS[range])
  }, [range, history, livePrice, liveTs, symbolTicks])

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

      const values = points.flatMap((p) => (p.ma ? [p.p, p.ma] : [p.p]))
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
      const muted = cssVar('--muted')
      const lineColor = gain ? cssVar('--up') : cssVar('--down')
      const timeLabel = range === '1D' ? formatHM : formatDate

      ctx.strokeStyle = grid
      ctx.lineWidth = 1
      ctx.font = "11px 'IBM Plex Mono', monospace"
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
      const nLabels = rect.width < 520 ? 3 : 5
      for (let i = 0; i < nLabels; i++) {
        const idx = Math.round((i / (nLabels - 1)) * (points.length - 1))
        const x = Math.min(Math.max(xAt(idx), left + 24), right - 24)
        ctx.fillText(timeLabel(points[idx].t), x, bottom + 8)
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

      // 50 day moving average
      if (range !== '1D') {
        ctx.save()
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = muted
        ctx.lineWidth = 1.2
        ctx.beginPath()
        let started = false
        points.forEach((p, i) => {
          if (p.ma == null) return
          if (!started) {
            ctx.moveTo(xAt(i), yAt(p.ma))
            started = true
          } else ctx.lineTo(xAt(i), yAt(p.ma))
        })
        ctx.stroke()
        ctx.restore()
      }

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
            : new Date(pt.t).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        const label = `${formatPrice(pt.p)}   ${when}${pt.ma ? `   50d ${pt.ma.toFixed(2)}` : ''}`
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
  }, [points, hoverX, theme, gain, last, range])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--muted)' }}>
          <Legend color={gain ? 'var(--up)' : 'var(--down)'} label="Price" />
          {range !== '1D' && <Legend color="var(--muted)" label="50 day average" dashed />}
        </div>
        <div style={{ width: 260 }}>
          <SegmentedControl
            options={RANGES.map((r) => ({ value: r, label: r === '1D' ? 'Live' : r }))}
            value={range}
            onChange={(r) => dispatch({ type: 'SET_RANGE', range: r })}
            height={26}
            fontSize={12}
          />
        </div>
      </div>
      <div
        ref={wrapperRef}
        style={{ position: 'relative', width: '100%', height: 300 }}
        onMouseMove={(e) => {
          const rect = wrapperRef.current?.getBoundingClientRect()
          if (rect) setHoverX(e.clientX - rect.left)
        }}
        onMouseLeave={() => setHoverX(null)}
      >
        <canvas ref={canvasRef} style={{ cursor: 'crosshair', display: 'block' }} />
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
            {range === '1D'
              ? 'Live ticks appear here while the US market is open. Add a free Finnhub key in Settings to stream prices.'
              : 'No price history for this range.'}
          </div>
        )}
      </div>
    </div>
  )
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 16, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
      {label}
    </span>
  )
}
