import { NavSegmented, StatusPill, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { botStatus } from '../utils/status'

export function Header() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const status = botStatus(state.botOn, state.mode)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        padding: '12px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--text)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--surface)' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.1 }}>Meridian</div>
          <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '.04em', ...mono }}>ALGO DESK v4.2</div>
        </div>
      </div>

      <StatusPill color={status.color} background="var(--inset)" label={status.label} pulse={status.pulse} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NavSegmented
          value={state.view}
          onChange={(view) => dispatch({ type: 'SET_VIEW', view })}
          options={[
            { value: 'dashboard', label: 'Dashboard' },
            { value: 'settings', label: 'Settings' },
          ]}
        />
        <button
          onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
          title="Toggle theme"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: 34,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--muted)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span style={mono}>{state.theme.toUpperCase()}</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'OPEN_DRAWER' })}
          title="Quick controls"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: 34,
            padding: '0 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Quick controls
        </button>
      </div>
    </header>
  )
}
