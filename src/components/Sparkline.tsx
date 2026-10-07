export function Sparkline({
  values,
  color,
  softColor,
  width = 88,
  height = 40,
}: {
  values: number[]
  color: string
  softColor: string
  width?: number
  height?: number
}) {
  if (values.length < 2) return <svg width={width} height={height} viewBox="0 0 100 40" />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const coords = values.map((v, i) => [(i / (values.length - 1)) * 100, 4 + (1 - (v - min) / range) * 32] as const)
  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

  return (
    <svg width={width} height={height} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
      <path d={`${linePath} L100,40 L0,40 Z`} fill={softColor} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}
