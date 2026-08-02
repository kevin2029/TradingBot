import { mono } from '../ui/Primitives'
import { useAppState } from '../state/store'
import type { AlertKind } from '../types'
import { formatClock } from '../utils/format'

const KIND_COLOR: Record<AlertKind, string> = {
  SYSTEM: 'var(--info)',
  RISK: 'var(--warn)',
  FEED: 'var(--warn)',
  SIGNAL: 'var(--up)',
  FILL: 'var(--info)',
}

export function AlertsPanel() {
  const state = useAppState()

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }}>
      <div style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700 }}>Alerts</div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {state.alerts.length === 0 && (
          <div style={{ padding: '13px 20px', fontSize: 12.5, color: 'var(--muted)' }}>No alerts yet.</div>
        )}
        {state.alerts.map((a) => (
          <div
            key={a.id}
            style={{
              padding: '13px 20px',
              display: 'flex',
              gap: 12,
              borderBottom: '1px solid var(--border)',
              animation: 'slidein .3s ease',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: KIND_COLOR[a.kind],
                marginTop: 6,
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>{a.message}</div>
              <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4, ...mono }}>
                {formatClock(a.ts)} · {a.kind}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
