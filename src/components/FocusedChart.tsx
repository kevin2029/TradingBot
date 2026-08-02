import { useEffect, useRef, useState } from 'react'
import { SegmentedControl, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { ASSETS, RANGE_WINDOWS } from '../data/assets'
import type { Range } from '../types'
import { formatHM, formatPrice, formatSigned } from '../utils/format'
import { cssVar, hexToRgba } from '../utils/canvas'

const RANGE_OPTIONS: Range[] = ['15M', '1H', '4H', '1D']

export function FocusedChart() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const def = ASSETS[state.focus]
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const allPts = state.series[state.focus].pts
  const windowSize = RANGE_WINDOWS[state.range]
  const windowPts = allPts.slice(-windowSize)
  const last = windowPts.length ? windowPts[windowPts.length - 1].p : def.base
  const first = windowPts.length ? windowPts[0].p : def.base
  const change = last - first
  const pct = first !== 0 ? (change / first) * 100 : 0
  const gain = change >= 0

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

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

      if (windowPts.length < 2) return

      const left = 8
      const right = rect.width - 62
      const top = 14
      const bottom = rect.height - 26
      const plotW = right - left
      const plotH = bottom - top

      const values = windowPts.map((p) => p.p)
      const min = Math.min(...values)
      const max = Math.max(...values)
      const span = max - min || max * 0.01 || 1
      const padMin = min - span * 0.12
      const padMax = max + span * 0.12
      const domain = padMax - padMin || 1

      const xAt = (i: number) => left + (i / (windowPts.length - 1)) * plotW
      const yAt = (p: number) => top + (1 - (p - padMin) / domain) * plotH

      const faint = cssVar('--faint')
      const grid = cssVar('--grid')
      const surface = cssVar('--surface')
      const text = cssVar('--text')
      const lineColor = gain ? cssVar('--up') : cssVar('--down')

      // gridlines + price labels
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
        const price = padMax - (i / 4) * domain
        ctx.textAlign = 'left'
        ctx.fillText(price.toFixed(2), right + 6, y)
      }

      // x-axis time labels
      ctx.textBaseline = 'top'
      ctx.textAlign = 'center'
      for (let i = 0; i < 5; i++) {
        const idx = Math.round((i / 4) * (windowPts.length - 1))
        const x = Math.min(Math.max(xAt(idx), left + 20), right - 20)
        ctx.fillText(formatHM(windowPts[idx].t), x, bottom + 8)
      }

      // area fill
      const gradient = ctx.createLinearGradient(0, top, 0, bottom)
      gradient.addColorStop(0, hexToRgba(lineColor, 0.22))
      gradient.addColorStop(1, hexToRgba(lineColor, 0))
      ctx.beginPath()
      windowPts.forEach((p, i) => {
        const x = xAt(i)
        const y = yAt(p.p)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.lineTo(right, bottom)
      ctx.lineTo(left, bottom)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()

      // line
      ctx.beginPath()
      windowPts.forEach((p, i) => {
        const x = xAt(i)
        const y = yAt(p.p)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 1.8
      ctx.lineJoin = 'round'
      ctx.stroke()

      // last price dashed rule + dot
      const lastY = yAt(last)
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(left, lastY)
      ctx.lineTo(right, lastY)
      ctx.stroke()
      ctx.restore()
      ctx.beginPath()
      ctx.fillStyle = lineColor
      ctx.arc(xAt(windowPts.length - 1), lastY, 3.5, 0, Math.PI * 2)
      ctx.fill()

      // crosshair
      if (hoverX !== null) {
        const clamped = Math.min(Math.max(hoverX, left), right)
        const idx = Math.round(((clamped - left) / plotW) * (windowPts.length - 1))
        const pt = windowPts[Math.min(Math.max(idx, 0), windowPts.length - 1)]
        const x = xAt(idx)
        const y = yAt(pt.p)

        ctx.strokeStyle = grid
        ctx.lineWidth = 1
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

        const label = `${formatPrice(pt.p, def.dollarPrefix)}   ${formatHM(pt.t)}:${new Date(pt.t)
          .getSeconds()
          .toString()
          .padStart(2, '0')}`
        ctx.font = "11px 'IBM Plex Mono', monospace"
        const textWidth = ctx.measureText(label).width
        const pillW = textWidth + 20
        const pillH = 22
        let pillX = x - pillW / 2
        pillX = Math.min(Math.max(pillX, left), right - pillW)
        const pillY = top

        ctx.beginPath()
        const r = 6
        ctx.moveTo(pillX + r, pillY)
        ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, r)
        ctx.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, r)
        ctx.arcTo(pillX, pillY + pillH, pillX, pillY, r)
        ctx.arcTo(pillX, pillY, pillX + pillW, pillY, r)
        ctx.closePath()
        ctx.fillStyle = surface
        ctx.fill()
        ctx.strokeStyle = grid
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = text
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, pillX + pillW / 2, pillY + pillH / 2 + 1)
      }
    }

    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowPts, hoverX, state.theme, gain, last, def.dollarPrefix])

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{def.name}</span>
            <span style={{ fontSize: 11, color: 'var(--faint)', ...mono }}>{def.symbol}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 600, ...mono }}>{formatPrice(last, def.dollarPrefix)}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: gain ? 'var(--up)' : 'var(--down)', ...mono }}>
              {formatSigned(change)} ({formatSigned(pct, 2, '%')})
            </span>
          </div>
        </div>
        <SegmentedControl
          options={RANGE_OPTIONS.map((r) => ({ value: r, label: r }))}
          value={state.range}
          onChange={(r) => dispatch({ type: 'SET_RANGE', range: r })}
          height={28}
          fontSize={12}
        />
      </div>

      <div
        ref={wrapperRef}
        style={{ position: 'relative', width: '100%', height: 320 }}
        onMouseMove={(e) => {
          const rect = wrapperRef.current?.getBoundingClientRect()
          if (rect) setHoverX(e.clientX - rect.left)
        }}
        onMouseLeave={() => setHoverX(null)}
      >
        <canvas ref={canvasRef} style={{ cursor: 'crosshair', display: 'block' }} />
      </div>
    </div>
  )
}
