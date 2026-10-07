import { useEffect } from 'react'
import { AppStateProvider, useAppState } from './state/store'
import { useSignals } from './data/useSignals'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { SettingsPage } from './components/SettingsPage'

function Shell() {
  const state = useAppState()
  useSignals()

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 48 }}>
      <Header />
      {/* keep the dashboard mounted so the live price stream survives a trip to Settings */}
      <div style={{ display: state.view === 'dashboard' ? 'block' : 'none' }}>
        <Dashboard />
      </div>
      {state.view === 'settings' && <SettingsPage />}
      <footer style={{ maxWidth: 1560, margin: '0 auto', padding: '0 24px', fontSize: 11.5, color: 'var(--faint)', lineHeight: 1.6 }}>
        For research only, not financial advice. Congress trade data by{' '}
        <a href="https://www.bargo.ai/free-apis/congress" target="_blank" rel="noreferrer">
          Bargo
        </a>
        , WSB data by{' '}
        <a href="https://apewisdom.io" target="_blank" rel="noreferrer">
          ApeWisdom
        </a>
        , live prices by{' '}
        <a href="https://finnhub.io" target="_blank" rel="noreferrer">
          Finnhub
        </a>
        .
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  )
}
