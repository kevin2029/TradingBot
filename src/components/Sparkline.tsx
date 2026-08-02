import type { PricePoint } from '../types'

export function Sparkline({ points, color, softColor }: { points: PricePoint[]; color: string; softColor: string }) {
  const recent = points.slice(-60)
  if (recent.length < 2) return <svg width={88} height={40} viewBox="0 0 100 40" />

  const values = recent.map((p) => p.p)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const coords = recent.map((p, i) => {
    const x = (i / (recent.length - 1)) * 100
    const y = 4 + (1 - (p.p - min) / range) * (36 - 4)
    return [x, y] as const
  })

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L100,40 L0,40 Z`

  return (
    <svg width={88} height={40} viewBox="0 0 100 40" preserveAspectRatio="none">
      <path d={areaPath} fill={softColor} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  )
}
