import type { ReactNode } from 'react'
import { useAppDispatch } from '../state/store'
import { ChevronRightIcon, GearIcon } from '../ui/Logo'
import type { View } from '../types'
import { MORE } from './Header'
import { PageHead } from './Page'

/** Phone: every page that does not fit in the tab bar, as a grouped list. */
export function MorePage() {
  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <PageHead title="More" />
      <Group>
        {MORE.map((m) => (
          <Item key={m.view} view={m.view} icon={m.icon({ size: 22 })} label={m.label} hint={m.hint} />
        ))}
      </Group>
      <Group>
        <Item view="settings" icon={<GearIcon size={22} />} label="Settings" hint="Live prices key, account size, appearance, data sources" />
      </Group>
    </main>
  )
}

function Group({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow)', padding: 6 }}>{children}</div>
}

function Item({ view, icon, label, hint }: { view: View; icon: ReactNode; label: string; hint?: string }) {
  const dispatch = useAppDispatch()
  return (
    <button
      className="tap row"
      onClick={() => dispatch({ type: 'SET_VIEW', view })}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 12px', border: 'none', borderRadius: 14, background: 'transparent', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--infosoft)', color: 'var(--info)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 500 }}>{label}</span>
        {hint && <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)' }}>{hint}</span>}
      </span>
      <span style={{ color: 'var(--faint)' }}>
        <ChevronRightIcon size={16} />
      </span>
    </button>
  )
}
