import { useState } from 'react'
import { FieldLabel, StatusPill, inputStyle, mono } from '../../ui/Primitives'
import { useAppDispatch, useAppState } from '../../state/store'
import type { Broker, BrokerEnv } from '../../types'
import { formatClock } from '../../utils/format'

const BROKER_OPTIONS: { value: Broker; label: string }[] = [
  { value: 'ibkr', label: 'Interactive Brokers' },
  { value: 'alpaca', label: 'Alpaca Markets' },
  { value: 'oanda', label: 'OANDA' },
  { value: 'tradovate', label: 'Tradovate' },
  { value: 'binance', label: 'Binance' },
  { value: 'custom', label: 'Custom FIX or REST endpoint' },
]

const ENV_OPTIONS: { value: BrokerEnv; label: string }[] = [
  { value: 'paper', label: 'Paper-demo' },
  { value: 'prod', label: 'Production' },
]

const CONN_PILL: Record<string, { color: string; bg: string; label: string; pulse?: string }> = {
  connected: { color: 'var(--up)', bg: 'var(--upsoft)', label: 'CONNECTED', pulse: '2.4s' },
  testing: { color: 'var(--warn)', bg: 'var(--warnsoft)', label: 'HANDSHAKING', pulse: '1s' },
  disconnected: { color: 'var(--faint)', bg: 'transparent', label: 'DISCONNECTED' },
}

export function BrokerConnection() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [lastHandshake, setLastHandshake] = useState<number | null>(null)
  const pill = CONN_PILL[state.conn]

  function testConnection() {
    dispatch({ type: 'SET_CONN', value: 'testing' })
    setTimeout(() => {
      dispatch({ type: 'SET_CONN', value: 'connected' })
      setLastHandshake(Date.now())
    }, 1600)
  }

  const brokerLabel = BROKER_OPTIONS.find((o) => o.value === state.broker)?.label ?? ''

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }}>
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Broker connection</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            Credentials are encrypted at rest and never leave your account.
          </div>
        </div>
        <StatusPill color={pill.color} background={pill.bg} label={pill.label} pulse={pill.pulse} />
      </div>

      <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 18 }}>
        <div>
          <FieldLabel>Broker</FieldLabel>
          <select
            value={state.broker}
            onChange={(e) => dispatch({ type: 'SET_BROKER', value: e.target.value as Broker })}
            style={inputStyle}
          >
            {BROKER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Environment</FieldLabel>
          <select
            value={state.brokerEnv}
            onChange={(e) => dispatch({ type: 'SET_BROKER_ENV', value: e.target.value as BrokerEnv })}
            style={inputStyle}
          >
            {ENV_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Account ID</FieldLabel>
          <input
            value={state.accountId}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'accountId', value: e.target.value })}
            style={{ ...inputStyle, ...mono }}
            placeholder="e.g. 101-004-2345678-001"
          />
        </div>

        <div>
          <FieldLabel>API endpoint</FieldLabel>
          <input
            value={state.endpoint}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'endpoint', value: e.target.value })}
            style={{ ...inputStyle, ...mono }}
            placeholder="https://api-fxpractice.oanda.com"
          />
        </div>

        <div>
          <FieldLabel>API key</FieldLabel>
          <input
            value={state.apiKey}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiKey', value: e.target.value })}
            style={{ ...inputStyle, ...mono }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>API secret</span>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SHOW_SECRET' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--info)', padding: 0 }}
            >
              {state.showSecret ? 'Hide' : 'Reveal'}
            </button>
          </div>
          <input
            type={state.showSecret ? 'text' : 'password'}
            value={state.apiSecret}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiSecret', value: e.target.value })}
            style={{ ...inputStyle, ...mono }}
          />
        </div>
      </div>

      <div
        style={{
          padding: '16px 22px',
          borderTop: '1px solid var(--border)',
          background: 'var(--inset)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--muted)', ...mono }}>
          {state.conn === 'connected'
            ? `${brokerLabel} · ${state.brokerEnv === 'paper' ? 'PAPER' : 'PRODUCTION'} · last handshake ${
                lastHandshake ? formatClock(lastHandshake) : '—'
              } · 4 instruments subscribed`
            : state.conn === 'testing'
              ? 'Testing…'
              : 'Not connected'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => dispatch({ type: 'SET_CONN', value: 'disconnected' })}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Disconnect
          </button>
          <button
            onClick={testConnection}
            disabled={state.conn === 'testing'}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 9,
              border: 'none',
              background: 'var(--info)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: state.conn === 'testing' ? 'default' : 'pointer',
              opacity: state.conn === 'testing' ? 0.7 : 1,
            }}
          >
            {state.conn === 'testing' ? 'Testing…' : 'Test connection'}
          </button>
        </div>
      </div>
    </div>
  )
}
