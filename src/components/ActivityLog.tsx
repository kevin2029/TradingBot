import { inputStyle, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { ASSETS, ASSET_ORDER } from '../data/assets'
import { formatClock, formatPrice, formatSigned } from '../utils/format'

const COLUMNS = '68px minmax(0, 1fr) 48px 78px 86px'

export function ActivityLog() {
  const state = useAppState()
  const dispatch = useAppDispatch()

  const filtered = state.trades
    .filter((t) => state.filterAsset === 'all' || t.asset === state.filterAsset)
    .filter((t) => state.filterSide === 'all' || t.side === state.filterSide)
    .slice(0, 40)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>Trading activity</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={state.filterAsset}
            onChange={(e) => dispatch({ type: 'SET_FILTER_ASSET', value: e.target.value as never })}
            style={{ ...inputStyle, height: 30, fontSize: 12, width: 'auto', padding: '0 8px' }}
          >
            <option value="all">All assets</option>
            {ASSET_ORDER.map((k) => (
              <option key={k} value={k}>
                {ASSETS[k].name}
              </option>
            ))}
          </select>
          <select
            value={state.filterSide}
            onChange={(e) => dispatch({ type: 'SET_FILTER_SIDE', value: e.target.value as never })}
            style={{ ...inputStyle, height: 30, fontSize: 12, width: 'auto', padding: '0 8px' }}
          >
            <option value="all">All types</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>
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
        <span>TIME</span>
        <span>ASSET</span>
        <span style={{ textAlign: 'right' }}>QTY</span>
        <span style={{ textAlign: 'right' }}>PRICE</span>
        <span style={{ textAlign: 'right' }}>P&amp;L</span>
      </div>

      <div style={{ maxHeight: 396, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '20px', fontSize: 12.5, color: 'var(--muted)' }}>No trades yet.</div>
        )}
        {filtered.map((t) => {
          const def = ASSETS[t.asset]
          const badgeColor = t.side === 'BUY' ? 'var(--up)' : 'var(--down)'
          const badgeBg = t.side === 'BUY' ? 'var(--upsoft)' : 'var(--downsoft)'
          return (
            <div
              key={t.id}
              style={{
                display: 'grid',
                gridTemplateColumns: COLUMNS,
                gap: 6,
                padding: '11px 20px',
                borderBottom: '1px solid var(--border)',
                fontSize: 12.5,
                alignItems: 'center',
                animation: 'slidein .3s ease',
                ...mono,
              }}
            >
              <span style={{ color: 'var(--muted)' }}>{formatClock(t.ts)}</span>
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
                  {t.side}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {def.name}
                </span>
              </span>
              <span style={{ textAlign: 'right', color: 'var(--muted)' }}>{t.qty}</span>
              <span style={{ textAlign: 'right' }}>{formatPrice(t.price, def.dollarPrefix)}</span>
              <span
                style={{
                  textAlign: 'right',
                  fontWeight: 600,
                  color: t.pnl >= 0 ? 'var(--up)' : 'var(--down)',
                }}
              >
                {formatSigned(t.pnl)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
