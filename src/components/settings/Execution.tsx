import { Card, FieldLabel, Switch, inputStyle } from '../../ui/Primitives'
import { useAppDispatch, useAppState } from '../../state/store'
import type { Currency, Interval, OrderType, Strategy } from '../../types'
import { botStatus } from '../../utils/status'

const STRATEGY_OPTIONS: { value: Strategy; label: string }[] = [
  { value: 'ma', label: 'MA crossover 12/48' },
  { value: 'rsi', label: 'RSI mean reversion' },
  { value: 'bb', label: 'Bollinger breakout' },
]
const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
  { value: '1m', label: '1 minute' },
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '1h', label: '1 hour' },
]
const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: 'market', label: 'Market' },
  { value: 'limit', label: 'Limit mid+offset' },
  { value: 'twap', label: 'TWAP over 5 min' },
]
const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
]

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: () => void
}) {
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

export function ModeToggle({ maxWidth = 360 }: { maxWidth?: number }) {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const status = botStatus(state.botOn, state.mode)

  return (
    <div style={{ maxWidth }}>
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
          }}
        >
          Live
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 8 }}>{status.sub}</div>
    </div>
  )
}

export function ExecutionFields({ columns = 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))' }: { columns?: string }) {
  const state = useAppState()
  const dispatch = useAppDispatch()

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 18 }}>
        <div>
          <FieldLabel>Signal source</FieldLabel>
          <select value={state.strategy} onChange={(e) => dispatch({ type: 'SET_STRATEGY', value: e.target.value as Strategy })} style={inputStyle}>
            {STRATEGY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Evaluation interval</FieldLabel>
          <select value={state.interval} onChange={(e) => dispatch({ type: 'SET_INTERVAL', value: e.target.value as Interval })} style={inputStyle}>
            {INTERVAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Order type</FieldLabel>
          <select value={state.orderType} onChange={(e) => dispatch({ type: 'SET_ORDER_TYPE', value: e.target.value as OrderType })} style={inputStyle}>
            {ORDER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Base currency</FieldLabel>
          <select value={state.currency} onChange={(e) => dispatch({ type: 'SET_CURRENCY', value: e.target.value as Currency })} style={inputStyle}>
            {CURRENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <SwitchRow
          label="Trailing stop"
          hint="Ratchets the stop loss as a position moves in your favor."
          checked={state.toggles.trailing}
          onChange={() => dispatch({ type: 'TOGGLE_EXEC_TOGGLE', key: 'trailing' })}
        />
        <SwitchRow
          label="Restrict to session hours"
          hint="Only evaluate and place orders 09:30–16:00 ET."
          checked={state.toggles.hours}
          onChange={() => dispatch({ type: 'TOGGLE_EXEC_TOGGLE', key: 'hours' })}
        />
        <SwitchRow
          label="Allow hedged positions"
          hint="Permit simultaneous long and short exposure on the same asset."
          checked={state.toggles.hedge}
          onChange={() => dispatch({ type: 'TOGGLE_EXEC_TOGGLE', key: 'hedge' })}
        />
      </div>
    </>
  )
}

export function Execution() {
  return (
    <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Execution</div>
      <ModeToggle />
      <ExecutionFields />
    </Card>
  )
}
