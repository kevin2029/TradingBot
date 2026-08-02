import { mono } from '../ui/Primitives'
import { useAppState } from '../state/store'
import { dayPnl } from '../state/selectors'
import { formatSigned } from '../utils/format'

export function LiveBanner() {
  const state = useAppState()
  if (state.mode !== 'live') return null
  const pnl = dayPnl(state)

  return (
    <div
      style={{
        position: 'sticky',
        top: 59,
        zIndex: 39,
        background: 'var(--downsoft)',
        borderBottom: '1px solid var(--down)',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--down)',
          animation: 'bp 1.4s infinite',
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--down)',
          letterSpacing: '.08em',
          ...mono,
        }}
      >
        LIVE TRADING — REAL CAPITAL AT RISK
      </span>
      <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
        Session P&amp;L {formatSigned(pnl)} · {state.trades.length} orders filled
      </span>
    </div>
  )
}
