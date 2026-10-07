import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BookIcon, BriefcaseIcon, CalendarIcon, ChartIcon, ChevronDownIcon, ColumnsIcon, FlameIcon, GearIcon, GridIcon, LogoMark, MoonIcon, MoreIcon, OverviewIcon, PeopleIcon, QuestionIcon, StarIcon, SunIcon, TargetIcon } from '../ui/Logo'
import { useAppDispatch, useAppState } from '../state/store'
import type { View } from '../types'
import { formatCountdown, marketClock } from '../utils/marketClock'
import { useNow } from './MarketClock'

type NavItem = { view: View; label: string; icon: (p: { size?: number }) => ReactNode; hint?: string }

/** The pages used every day: always visible. */
export const NAV: NavItem[] = [
  { view: 'overview', label: 'Overview', icon: () => <OverviewIcon /> },
  { view: 'stocks', label: 'Stocks', icon: () => <ChartIcon /> },
  { view: 'watchlist', label: 'Watchlist', icon: ({ size }) => <StarIcon size={size} /> },
  { view: 'positions', label: 'Positions', icon: ({ size }) => <BriefcaseIcon size={size} /> },
]

/** Everything else, behind "More". */
export const MORE: NavItem[] = [
  { view: 'hot', label: 'Hot & new', icon: ({ size }) => <FlameIcon size={size} />, hint: 'Popular, volatile and newly listed stocks' },
  { view: 'insiders', label: 'Insider activity', icon: () => <PeopleIcon />, hint: 'Latest insider trades and Congress totals' },
  { view: 'calendar', label: 'Calendar', icon: () => <CalendarIcon />, hint: 'Earnings, IPOs, lock-ups and market holidays' },
  { view: 'sectors', label: 'Sectors', icon: () => <GridIcon />, hint: 'Which industries lead and which lag' },
  { view: 'compare', label: 'Compare', icon: () => <ColumnsIcon />, hint: 'Up to three stocks side by side' },
  { view: 'journal', label: 'Journal', icon: () => <BookIcon />, hint: 'Your closed trades against their plans' },
  { view: 'performance', label: 'Performance', icon: () => <TargetIcon />, hint: 'Backtest and live track record' },
  { view: 'glossary', label: 'Glossary', icon: () => <QuestionIcon />, hint: 'What the terms mean' },
]

const TABS: NavItem[] = [...NAV, { view: 'more', label: 'More', icon: () => <MoreIcon /> }]

const SESSION_LABEL = { pre: 'Pre-market', regular: 'Market open', post: 'After hours', closed: 'Market closed' } as const
const SESSION_COLOR = { pre: 'var(--info)', regular: 'var(--up)', post: 'var(--warn)', closed: 'var(--faint)' } as const

/** US session + live feed in one quiet line: "● Market open · closes in 2h 14m". */
export function MarketStatus({ compact = false }: { compact?: boolean }) {
  const { live } = useAppState()
  const now = useNow(1000)
  const c = marketClock(now)
  const left = formatCountdown(c.next.at - now)
  const next = c.session === 'regular' ? `closes in ${left}` : c.next.label === 'Opens' || c.session === 'pre' ? `opens in ${left}` : `${c.next.label.toLowerCase()} in ${left}`
  const feed = live.status === 'live' ? 'Live prices' : live.status === 'no-key' ? 'Delayed prices (add a Finnhub key in Settings)' : live.status === 'error' ? `Price feed error${live.message ? `: ${live.message}` : ''}` : live.status === 'connecting' ? 'Connecting to live prices' : 'Live feed idle'
  return (
    <div title={`${SESSION_LABEL[c.session]}, ${next}\n${feed}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: SESSION_COLOR[c.session],
          boxShadow: live.status === 'live' ? `0 0 0 3px color-mix(in srgb, ${SESSION_COLOR[c.session]} 22%, transparent)` : undefined,
        }}
      />
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{SESSION_LABEL[c.session]}</span>
      {!compact && <span className="hide-md">· {next}</span>}
    </div>
  )
}

export function Header() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const openCount = state.positions.filter((p) => !p.closed).length

  return (
    <header className="material" style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', height: 56, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'overview' })}
          title="Overview"
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}
        >
          <LogoMark size={28} />
          <span style={{ fontSize: 17, fontWeight: 650, letterSpacing: '-.02em' }}>Kevision</span>
        </button>

        <nav className="nav-top" aria-label="Main" style={{ gap: 2, flex: 1, justifyContent: 'center' }}>
          {NAV.map((n) => {
            const on = state.view === n.view
            return (
              <button
                key={n.view}
                className="tap"
                aria-current={on ? 'page' : undefined}
                onClick={() => dispatch({ type: 'SET_VIEW', view: n.view })}
                style={{
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: on ? 600 : 500,
                  color: on ? 'var(--info)' : 'var(--muted)',
                  background: on ? 'var(--infosoft)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {n.label}
                {n.view === 'positions' && openCount > 0 && <Count n={openCount} />}
              </button>
            )
          })}
          <MoreMenu />
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
          <div className="hide-sm" style={{ marginRight: 8 }}>
            <MarketStatus />
          </div>
          <IconButton title={state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => dispatch({ type: 'TOGGLE_THEME' })}>
            {state.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </IconButton>
          <IconButton title="Settings" active={state.view === 'settings'} onClick={() => dispatch({ type: 'SET_VIEW', view: 'settings' })}>
            <GearIcon />
          </IconButton>
        </div>
      </div>
    </header>
  )
}

/** Phone: translucent tab bar at the bottom, thumb-reachable. */
export function TabBar() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const openCount = state.positions.filter((p) => !p.closed).length
  return (
    <nav
      className="tabbar material"
      aria-label="Main"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        borderTop: '1px solid var(--hairline)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map((n) => {
        const on = state.view === n.view || (n.view === 'more' && MORE.some((m) => m.view === state.view || state.view === 'settings'))
        return (
          <button
            key={n.view}
            aria-current={on ? 'page' : undefined}
            onClick={() => dispatch({ type: 'SET_VIEW', view: n.view })}
            style={{
              height: 58,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: on ? 'var(--info)' : 'var(--faint)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: 0,
              position: 'relative',
            }}
          >
            {n.icon({ size: 22 })}
            {n.label}
            {n.view === 'positions' && openCount > 0 && (
              <span style={{ position: 'absolute', top: 6, left: 'calc(50% + 8px)' }}>
                <Count n={openCount} />
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

function Count({ n }: { n: number }) {
  return (
    <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--info)', color: '#fff', fontSize: 11, fontWeight: 600, lineHeight: '18px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
  )
}

function IconButton({ children, title, onClick, active }: { children: ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      className="tap"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        width: 34,
        height: 34,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 999,
        border: 'none',
        background: active ? 'var(--seg-track)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--muted)',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

/** Desktop "More" popover: grows out of its button, closes on pick, outside click or Escape. */
function MoreMenu() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = MORE.find((m) => m.view === state.view)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="tap"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          height: 34,
          padding: '0 12px 0 14px',
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: current ? 600 : 500,
          color: current ? 'var(--info)' : open ? 'var(--text)' : 'var(--muted)',
          background: current ? 'var(--infosoft)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        {current ? current.label : 'More'}
        <span style={{ display: 'grid', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-ui) var(--ease-out)' }}>
          <ChevronDownIcon />
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="menu-pop material-strong"
          style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', width: 320, marginLeft: -160, borderRadius: 16, padding: 6, boxShadow: '0 12px 40px rgba(0,0,0,.18), 0 0 0 1px var(--hairline)', zIndex: 60 }}
        >
          {MORE.map((m) => {
            const on = state.view === m.view
            return (
              <button
                key={m.view}
                role="menuitem"
                className="tap row"
                onClick={() => {
                  dispatch({ type: 'SET_VIEW', view: m.view })
                  setOpen(false)
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', border: 'none', borderRadius: 10, background: on ? 'var(--seg-track)' : 'transparent', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ color: 'var(--info)', display: 'grid' }}>{m.icon({ size: 22 })}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{m.label}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)' }}>{m.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
