import { useState } from 'react'
import { Card, FieldLabel, inputStyle, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import { Appearance } from './settings/Appearance'
import { COMPONENT_META, COMPONENT_ORDER } from '../utils/signals'
import { btn } from './BuyPanel'
import { SourcesCard } from './SourcesCard'
import { PageHead } from './Page'

export function SettingsPage() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [draft, setDraft] = useState(state.finnhubKey)
  const [show, setShow] = useState(false)
  const saved = draft.trim() === state.finnhubKey

  return (
    <main className="page" style={{ maxWidth: 900 }}>
      <PageHead title="Settings" sub="Everything here is stored only in this browser." />
      <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="t-headline">Live prices</div>
        <p className="t-sub" style={{ margin: 0 }}>
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
            <div className="t-sub" style={{ marginTop: 8 }}>
              Status: <span>{state.live.status.replace('-', ' ')}</span>
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
        <div className="t-headline">How the score works</div>
        <p className="t-sub" style={{ margin: 0 }}>
          A fixed list of about 100 large US stocks is scored every run, plus stocks that show up in Congress trades, contracts or lobbying, so the ranking is not driven by hype. Each signal is scaled from −100 to +100 and weighted; the weights follow what research finds predictive, so the chart (momentum) and insider buying count most. Missing data counts as neutral, so a stock needs several sources agreeing to score high.
          68+ is a strong buy, 58+ a buy, 45+ watch, below that avoid. In a risk-off market every score drops 5 points.
        </p>
        {state.signals && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {COMPONENT_ORDER.map((k) => (
              <div key={k} style={{ background: 'var(--inset)', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {COMPONENT_META[k].label} <span style={{ color: 'var(--faint)', ...mono }}>{Math.round(state.signals!.weights[k] * 100)}%</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45 }}>{COMPONENT_META[k].hint}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AccountCard />

      <Appearance />

      <SourcesCard />
    </main>
  )
}

function AccountCard() {
  const { accountSize } = useAppState()
  const dispatch = useAppDispatch()
  const [draft, setDraft] = useState(accountSize ? String(accountSize) : '')
  const value = Number(draft.replace(/[^0-9.]/g, ''))
  return (
    <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="t-headline">Account size</div>
      <p className="t-sub" style={{ margin: 0 }}>
        Optional. Used to turn position sizes into a number of shares and to check portfolio risk (all stops together at most 6% of the account, at most 30% in
        one industry). Stored only in this browser.
      </p>
      <div style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
        <input inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. 10000" style={{ ...inputStyle, ...mono }} />
        <Btn primary disabled={(value || null) === accountSize} onClick={() => dispatch({ type: 'SET_ACCOUNT', size: value > 0 ? value : null })}>
          Save
        </Btn>
      </div>
    </Card>
  )
}

function Btn({ children, onClick, primary, disabled }: { children: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...btn(!!primary), cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1, flexShrink: 0 }}>
      {children}
    </button>
  )
}
