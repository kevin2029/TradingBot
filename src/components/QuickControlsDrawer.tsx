import type { ReactNode } from 'react'
import { Eyebrow } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { ExecutionFields, ModeToggle } from './settings/Execution'
import { RiskSliders } from './settings/RiskManagement'
import { AppearanceToggle } from './settings/Appearance'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  )
}

export function QuickControlsDrawer() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const open = state.settingsOpen

  return (
    <>
      <div
        onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(6,10,15,.5)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .25s',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 51,
          width: 'min(440px, 100%)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-20px 0 60px rgba(0,0,0,.22)',
          transform: open ? 'translateX(0)' : 'translateX(103%)',
          transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
          display: 'flex',
          flexDirection: 'column',
          visibility: open ? 'visible' : 'hidden',
        }}
        aria-hidden={!open}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, lineHeight: '22px' }}>Quick controls</span>
          <button
            onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 26, overflowY: 'auto' }}>
          <Section title="Execution mode">
            <ModeToggle maxWidth={9999} />
          </Section>
          <Section title="Risk">
            <RiskSliders columns="1fr" />
          </Section>
          <Section title="Strategy">
            <ExecutionFields columns="1fr" />
          </Section>
          <Section title="Appearance">
            <AppearanceToggle maxWidth={9999} />
          </Section>
        </div>
      </div>
    </>
  )
}
