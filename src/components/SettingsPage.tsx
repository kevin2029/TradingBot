import { useState } from 'react'
import { Card, FieldLabel, inputStyle, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { Appearance } from './settings/Appearance'
import { COMPONENT_META, COMPONENT_ORDER } from '../utils/signals'

export function SettingsPage() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [draft, setDraft] = useState(state.finnhubKey)
  const [show, setShow] = useState(false)
  const saved = draft.trim() === state.finnhubKey

  return (
    <main className="page" style={{ maxWidth: 900 }}>
      <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Live prices</div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          Real-time prices stream from Finnhub's free tier (WebSocket, up to 50 symbols). Get a free key at{' '}
          <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">
            finnhub.io/register
          </a>
          . The key is stored only in this browser and sent only to Finnhub.
        </p>
        <div>
          <FieldLabel>Finnhub API key</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={show ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="paste your key"
              autoComplete="off"
              spellCheck={false}
              style={{ ...inputStyle, ...mono }}
            />
            <Btn onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</Btn>
            <Btn primary disabled={saved} onClick={() => dispatch({ type: 'SET_KEY', key: draft })}>
              Save
            </Btn>
          </div>
          {state.finnhubKey && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              Status: <span style={mono}>{state.live.status.toUpperCase()}</span>
              {state.live.message ? ` (${state.live.message})` : ''}
              {' · '}
              <a href="#" onClick={(e) => (e.preventDefault(), setDraft(''), dispatch({ type: 'SET_KEY', key: '' }))}>
                Remove key
              </a>
            </div>
          )}
        </div>
      </Card>

      <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>How the score works</div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          Each signal is scaled from −100 to +100 and weighted. Missing data counts as neutral, so a stock needs several sources agreeing to score high.
          68+ is a strong buy, 58+ a buy, 45+ watch, below that avoid. In a risk-off market every score drops 5 points.
        </p>
        {state.signals && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {COMPONENT_ORDER.map((k) => (
              <div key={k} style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {COMPONENT_META[k].label} <span style={{ color: 'var(--faint)', ...mono }}>{Math.round(state.signals!.weights[k] * 100)}%</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{COMPONENT_META[k].hint}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Appearance />
    </main>
  )
}

function Btn({ children, onClick, primary, disabled }: { children: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 38,
        padding: '0 16px',
        borderRadius: 8,
        border: primary ? 'none' : '1px solid var(--border)',
        background: primary ? 'var(--info)' : 'var(--surface)',
        color: primary ? '#fff' : 'var(--text)',
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}
