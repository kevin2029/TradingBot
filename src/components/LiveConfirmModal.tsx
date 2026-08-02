import { mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'

export function LiveConfirmModal() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  if (!state.confirmOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(6,10,15,.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={() => dispatch({ type: 'CLOSE_LIVE_CONFIRM' })}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          borderRadius: 16,
          padding: 26,
          background: 'var(--surface)',
          boxShadow: '0 30px 80px rgba(0,0,0,.4)',
          animation: 'slidein .18s ease',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--down)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'var(--down)', ...mono }}>
            SWITCH TO LIVE TRADING
          </span>
        </div>

        <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 16 }}>
          Orders will be routed to the exchange and executed with real capital.
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>
          Current limits: {state.risk.size}% max size · {state.risk.loss}% daily loss limit · {state.risk.concurrent}{' '}
          concurrent positions
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button
            onClick={() => dispatch({ type: 'CLOSE_LIVE_CONFIRM' })}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Stay in Sandbox
          </button>
          <button
            onClick={() => dispatch({ type: 'CONFIRM_LIVE' })}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 9,
              border: 'none',
              background: 'var(--down)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Enable live trading
          </button>
        </div>
      </div>
    </div>
  )
}
