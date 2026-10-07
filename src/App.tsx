import { useEffect, useRef } from 'react'
import { AppStateProvider, hashFor, parseHash, useAppDispatch, useAppState } from './state/store'
import { useSignals } from './data/useSignals'
import { Header, TabBar } from './components/Header'
import { LiveFeed } from './components/LiveFeed'
import { Footer } from './components/Page'
import { OverviewPage } from './components/OverviewPage'
import { StocksPage } from './components/StocksPage'
import { HotPage } from './components/HotPage'
import { PositionsPage } from './components/PositionsPage'
import { PerformancePage } from './components/PerformancePage'
import { SettingsPage } from './components/SettingsPage'
import { WatchlistPage } from './components/WatchlistPage'
import { InsidersPage } from './components/InsidersPage'
import { CalendarPage } from './components/CalendarPage'
import { SectorsPage } from './components/SectorsPage'
import { ComparePage } from './components/ComparePage'
import { JournalPage } from './components/JournalPage'
import { GlossaryPage } from './components/GlossaryPage'
import { MorePage } from './components/MorePage'
import { Splash } from './components/Splash'

/** Keeps the URL hash and the app state in step, so back/forward and links work. */
function useHashRoute() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const want = hashFor(state)
  const first = useRef(true)

  useEffect(() => {
    // the first sync only tidies the URL; later changes become history entries
    if (location.hash !== want) history[first.current ? 'replaceState' : 'pushState'](null, '', want)
    first.current = false
  }, [want])

  useEffect(() => {
    const onPop = () => {
      const r = parseHash(location.hash)
      dispatch({ type: 'ROUTE', view: r.view, symbol: r.symbol })
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [dispatch])

  // a new screen starts at the top; picking another stock on a wide screen does not
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [state.view, state.detail])
}

function Shell() {
  const state = useAppState()
  useSignals()
  useHashRoute()

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Splash />
      <LiveFeed />
      <Header />
      {state.view === 'overview' && <OverviewPage />}
      {state.view === 'stocks' && <StocksPage />}
      {state.view === 'hot' && <HotPage />}
      {state.view === 'positions' && <PositionsPage />}
      {state.view === 'performance' && <PerformancePage />}
      {state.view === 'watchlist' && <WatchlistPage />}
      {state.view === 'insiders' && <InsidersPage />}
      {state.view === 'calendar' && <CalendarPage />}
      {state.view === 'sectors' && <SectorsPage />}
      {state.view === 'compare' && <ComparePage />}
      {state.view === 'journal' && <JournalPage />}
      {state.view === 'glossary' && <GlossaryPage />}
      {state.view === 'more' && <MorePage />}
      {state.view === 'settings' && <SettingsPage />}
      <Footer />
      <TabBar />
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
