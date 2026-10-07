import type { ReactNode } from 'react'
import { StatusPill, mono } from '../ui/Primitives'
import { GearIcon, LogoMark, MoonIcon, SunIcon } from '../ui/Logo'
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
      <button
        onClick={() => dispatch({ type: 'SET_VIEW', view: 'dashboard' })}
        title="Back to signals"
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', textAlign: 'left' }}
      >
        <LogoMark />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.1 }}>Meridian</div>
          <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: '.04em', ...mono }}>SIGNAL DESK</div>
        </div>
      </button>

      <div title={state.live.message ?? (state.live.status === 'no-key' ? 'Add a free Finnhub key in Settings for live prices' : undefined)}>
        <StatusPill color={status.color} background="var(--inset)" label={status.label} pulse={status.pulse} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton
          title={state.view === 'settings' ? 'Back to signals' : 'Settings'}
          active={state.view === 'settings'}
          onClick={() => dispatch({ type: 'SET_VIEW', view: state.view === 'settings' ? 'dashboard' : 'settings' })}
        >
          <GearIcon />
        </IconButton>
        <IconButton title={state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => dispatch({ type: 'TOGGLE_THEME' })}>
          {state.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconButton>
      </div>
    </header>
  )
}

function IconButton({ children, title, onClick, active }: { children: ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        width: 34,
        height: 34,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--info)' : 'var(--border)'}`,
        background: active ? 'var(--infosoft)' : 'var(--surface)',
        color: active ? 'var(--info)' : 'var(--muted)',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}
