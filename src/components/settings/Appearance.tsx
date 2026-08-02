import { Card } from '../../ui/Primitives'
import { useAppDispatch, useAppState } from '../../state/store'
import type { Theme } from '../../types'

export function AppearanceToggle({ maxWidth = 360 }: { maxWidth?: number }) {
  const state = useAppState()
  const dispatch = useAppDispatch()

  function setTheme(theme: Theme) {
    if (theme !== state.theme) dispatch({ type: 'TOGGLE_THEME' })
  }

  return (
    <div
      style={{
        maxWidth,
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
        onClick={() => setTheme('light')}
        style={{
          height: 34,
          borderRadius: 7,
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          background: state.theme === 'light' ? 'var(--surface)' : 'transparent',
          color: state.theme === 'light' ? 'var(--text)' : 'var(--muted)',
          boxShadow: state.theme === 'light' ? '0 1px 3px rgba(0,0,0,.18)' : 'none',
        }}
      >
        Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        style={{
          height: 34,
          borderRadius: 7,
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          background: state.theme === 'dark' ? 'var(--surface)' : 'transparent',
          color: state.theme === 'dark' ? 'var(--text)' : 'var(--muted)',
          boxShadow: state.theme === 'dark' ? '0 1px 3px rgba(0,0,0,.18)' : 'none',
        }}
      >
        Dark
      </button>
    </div>
  )
}

export function Appearance() {
  return (
    <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Appearance</div>
      <AppearanceToggle />
    </Card>
  )
}
