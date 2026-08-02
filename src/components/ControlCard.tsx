import { useEffect, useState } from 'react'
import { Card, Eyebrow, MasterToggle, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { botStatus } from '../utils/status'
import { formatUptime } from '../utils/format'

export function ControlCard() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const status = botStatus(state.botOn, state.mode)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const trackColor = !state.botOn ? 'var(--surface2)' : state.mode === 'live' ? 'var(--down)' : 'var(--up)'
  const borderColor = !state.botOn ? 'var(--border2)' : 'transparent'

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Eyebrow>Control</Eyebrow>
        <span style={{ fontSize: 11, color: 'var(--faint)', ...mono }}>{formatUptime(now - state.startedAt)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <MasterToggle
          checked={state.botOn}
          trackColor={trackColor}
          borderColor={borderColor}
          onChange={() => dispatch({ type: 'TOGGLE_BOT' })}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: status.color, lineHeight: 1.2 }}>
            {status.label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{status.sub}</div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.04em' }}>
          EXECUTION MODE
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
            padding: 4,
            background: 'var(--inset)',
            border: '1px solid var(--border)',
            borderRadius: 10,
          }}
        >
          <button
            onClick={() => dispatch({ type: 'PICK_SANDBOX' })}
            style={{
              height: 34,
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: state.mode === 'sandbox' ? 'var(--surface)' : 'transparent',
              color: state.mode === 'sandbox' ? 'var(--text)' : 'var(--muted)',
              boxShadow: state.mode === 'sandbox' ? '0 1px 3px rgba(0,0,0,.18)' : 'none',
              transition: 'all .15s',
            }}
          >
            Sandbox
          </button>
          <button
            onClick={() => dispatch({ type: 'OPEN_LIVE_CONFIRM' })}
            style={{
              height: 34,
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: state.mode === 'live' ? 'var(--surface)' : 'transparent',
              color: state.mode === 'live' ? 'var(--down)' : 'var(--muted)',
              boxShadow: state.mode === 'live' ? '0 1px 3px rgba(0,0,0,.18)' : 'none',
              transition: 'all .15s',
            }}
          >
            Live
          </button>
        </div>
      </div>
    </Card>
  )
}
