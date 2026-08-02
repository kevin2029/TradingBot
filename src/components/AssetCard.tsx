import { Chip, mono } from '../ui/Primitives'
import { Sparkline } from './Sparkline'
import { useAppDispatch, useAppState } from '../state/store'
import type { AssetKey } from '../types'
import { ASSETS } from '../data/assets'
import { formatPrice, formatSigned } from '../utils/format'

export function AssetCard({ assetKey }: { assetKey: AssetKey }) {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const def = ASSETS[assetKey]
  const series = state.series[assetKey]
  const pts = series.pts
  const last = pts.length ? pts[pts.length - 1].p : def.base
  const change = last - series.open
  const pct = (change / series.open) * 100
  const gain = change >= 0
  const color = gain ? 'var(--up)' : 'var(--down)'
  const soft = gain ? 'var(--upsoft)' : 'var(--downsoft)'
  const selected = state.focus === assetKey

  return (
    <button
      onClick={() => dispatch({ type: 'SET_FOCUS', asset: assetKey })}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        background: 'var(--surface)',
        border: `1px solid ${selected ? 'var(--border2)' : 'var(--border)'}`,
        borderRadius: 14,
        boxShadow: 'var(--shadow)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{def.name}</span>
        <Chip>{def.symbol}</Chip>
      </div>

      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', ...mono }}>
        {formatPrice(last, def.dollarPrefix)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color, ...mono }}>{formatSigned(change)}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: soft,
              color,
              borderRadius: 4,
              padding: '1px 5px',
              ...mono,
            }}
          >
            {formatSigned(pct, 2, '%')}
          </span>
        </div>
        <Sparkline points={pts} color={color} softColor={soft} />
      </div>
    </button>
  )
}
