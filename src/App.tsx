import { useEffect } from 'react'
import { AppStateProvider, useAppState } from './state/store'
import { useMarketFeed } from './data/useMarketFeed'
import { Header } from './components/Header'
import { LiveBanner } from './components/LiveBanner'
import { Dashboard } from './components/Dashboard'
import { SettingsPage } from './components/SettingsPage'
import { QuickControlsDrawer } from './components/QuickControlsDrawer'
import { LiveConfirmModal } from './components/LiveConfirmModal'

function Shell() {
  const state = useAppState()
  useMarketFeed()

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 48 }}>
      <Header />
      <LiveBanner />
      {state.view === 'dashboard' ? <Dashboard /> : <SettingsPage />}
      <QuickControlsDrawer />
      <LiveConfirmModal />
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
