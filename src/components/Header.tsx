import { NavSegmented, StatusPill, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { LiveStatus } from '../types'

const LIVE_META: Record<LiveStatus, { label: string; color: string; pulse?: string }> = {
  'no-key': { label: 'DELAYED', color: 'var(--faint)' },
  connecting: { label: 'CONNECTING', color: 'var(--warn)', pulse: '1.2s' },
  live: { label: 'LIVE', color: 'var(--up)', pulse: '1.6s' },
  closed: { label: 'MARKET CLOSED', color: 'var(--muted)' },
  error: { label: 'FEED ERROR', color: 'var(--down)' },
}

export function Header() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  let status = LIVE_META[state.live.status]
  if (state.live.status === 'closed' && state.live.marketOpen) status = { label: 'NO TICKS', color: 'var(--warn)' }

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
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--text)', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--surface)' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.1 }}>Meridian</div>
          <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '.04em', ...mono }}>SIGNAL DESK</div>
        </div>
      </div>

      <div title={state.live.message ?? (state.live.status === 'no-key' ? 'Add a free Finnhub key in Settings for live prices' : undefined)}>
        <StatusPill color={status.color} background="var(--inset)" label={status.label} pulse={status.pulse} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NavSegmented
          value={state.view}
          onChange={(view) => dispatch({ type: 'SET_VIEW', view })}
          options={[
            { value: 'dashboard', label: 'Signals' },
            { value: 'settings', label: 'Settings' },
          ]}
        />
        <button
          onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
          title="Toggle theme"
          style={{
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
      </div>
    </header>
  )
}
