import { Card, Eyebrow, mono } from '../ui/Primitives'
import { useAppState } from '../state/store'
import { buyingPower, dayPnl, equity } from '../state/selectors'
import { formatMoney, formatSigned } from '../utils/format'

export function AccountCard() {
  const state = useAppState()
  const eq = equity(state)
  const bp = buyingPower(state)
  const pnl = dayPnl(state)
  const pnlColor = pnl >= 0 ? 'var(--up)' : 'var(--down)'

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <Eyebrow>Account</Eyebrow>
      <div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1, ...mono }}>
          {formatMoney(eq)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Total equity</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 'auto' }}>
        <div
          style={{
            background: 'var(--inset)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Buying power</div>
          <div style={{ fontSize: 15, fontWeight: 600, ...mono }}>{formatMoney(bp, 0)}</div>
        </div>
        <div
          style={{
            background: 'var(--inset)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Day P&amp;L</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: pnlColor, ...mono }}>{formatSigned(pnl)}</div>
        </div>
      </div>
    </Card>
  )
}
