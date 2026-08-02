import { Card, FieldLabel, Switch, inputStyle } from '../../ui/Primitives'
import { useAppDispatch, useAppState } from '../../state/store'
import type { NotificationSettings } from '../../types'

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>{hint}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}

const ROWS: { key: keyof NotificationSettings; label: string; hint: string }[] = [
  { key: 'fills', label: 'Order fills', hint: 'Notify when an order executes.' },
  { key: 'risk', label: 'Risk breaches', hint: 'Notify when a risk limit is hit.' },
  { key: 'digest', label: 'Daily performance digest', hint: 'A daily summary of P&L and activity.' },
]

export function Notifications() {
  const state = useAppState()
  const dispatch = useAppDispatch()

  return (
    <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Notifications</div>
      <div style={{ maxWidth: 420 }}>
        <FieldLabel>Webhook URL</FieldLabel>
        <input
          value={state.webhook}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'webhook', value: e.target.value })}
          style={inputStyle}
          placeholder="https://hooks.example.com/meridian"
        />
      </div>
      <div>
        {ROWS.map((r) => (
          <SwitchRow
            key={r.key}
            label={r.label}
            hint={r.hint}
            checked={state.notifs[r.key]}
            onChange={() => dispatch({ type: 'TOGGLE_NOTIF', key: r.key })}
          />
        ))}
      </div>
    </Card>
  )
}
