import { mono } from '../ui/Primitives'
import { useAppState } from '../state/store'
import { ASSETS } from '../data/assets'
import { lastPrice } from '../state/selectors'
import { formatPrice, formatSigned } from '../utils/format'

const COLUMNS = 'minmax(0, 1fr) 46px 74px 74px 86px'

export function OpenPositions() {
  const state = useAppState()

  const rows = state.positions.map((pos) => {
    const def = ASSETS[pos.asset]
    const mark = lastPrice(state, pos.asset)
    const diff = (mark - pos.entry) * pos.qty * def.multiplier
    const unrealized = pos.side === 'LONG' ? diff : -diff
    return { pos, def, mark, unrealized }
  })
  const totalUnrealized = rows.reduce((s, r) => s + r.unrealized, 0)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }}>
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>Open positions</span>
        <span
          style={{
            fontSize: 11,
            background: 'var(--inset)',
            borderRadius: 999,
            padding: '1px 8px',
            ...mono,
          }}
        >
          {rows.length}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            fontWeight: 600,
            color: totalUnrealized >= 0 ? 'var(--up)' : 'var(--down)',
            ...mono,
          }}
        >
          {formatSigned(totalUnrealized)}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLUMNS,
          gap: 6,
          padding: '9px 20px',
          background: 'var(--inset)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '.08em',
          color: 'var(--faint)',
          ...mono,
        }}
      >
        <span>POSITION</span>
        <span style={{ textAlign: 'right' }}>QTY</span>
        <span style={{ textAlign: 'right' }}>ENTRY</span>
        <span style={{ textAlign: 'right' }}>MARK</span>
        <span style={{ textAlign: 'right' }}>UNREAL.</span>
      </div>

      {rows.map(({ pos, def, mark, unrealized }) => {
        const badgeColor = pos.side === 'LONG' ? 'var(--up)' : 'var(--down)'
        const badgeBg = pos.side === 'LONG' ? 'var(--upsoft)' : 'var(--downsoft)'
        return (
          <div
            key={pos.id}
            style={{
              display: 'grid',
              gridTemplateColumns: COLUMNS,
              gap: 6,
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
              fontSize: 12.5,
              alignItems: 'center',
              ...mono,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 4,
                  padding: '1px 5px',
                  background: badgeBg,
                  color: badgeColor,
                  flexShrink: 0,
                }}
              >
                {pos.side}
              </span>
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {def.name}
              </span>
            </span>
            <span style={{ textAlign: 'right', color: 'var(--muted)' }}>{pos.qty}</span>
            <span style={{ textAlign: 'right' }}>{formatPrice(pos.entry, def.dollarPrefix)}</span>
            <span style={{ textAlign: 'right' }}>{formatPrice(mark, def.dollarPrefix)}</span>
            <span
              style={{
                textAlign: 'right',
                fontWeight: 600,
                color: unrealized >= 0 ? 'var(--up)' : 'var(--down)',
              }}
            >
              {formatSigned(unrealized)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
