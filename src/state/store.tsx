import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import type { ActionFilter, ChartRange, LiveQuote, LiveStatus, Overlay, Position, SignalsFile, SortKey, Theme, View, WatchItem } from '../types'

export interface Tick {
  t: number
  p: number
}

export interface AppState {
  theme: Theme
  view: View
  selected: string | null
  /** narrow screens: the stock detail is its own screen (#/stocks/SYMBOL) */
  detail: boolean
  /** selected stock on the Hot & new page */
  hotSelected: string | null
  filter: ActionFilter
  sort: SortKey
  overlays: Record<Overlay, boolean>
  range: ChartRange
  finnhubKey: string
  signals: SignalsFile | null
  signalsError: string | null
  signalsLoading: boolean
  quotes: Record<string, LiveQuote>
  ticks: Record<string, Tick[]>
  live: { status: LiveStatus; message?: string; marketOpen: boolean | null }
  positions: Position[]
  /** optional account size in dollars, for portfolio risk */
  accountSize: number | null
  watchlist: WatchItem[]
  /** up to three symbols on the Compare page */
  compare: string[]
}

export type Action =
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_VIEW'; view: View }
  | { type: 'SELECT'; symbol: string }
  /** open a stock's page from anywhere */
  | { type: 'OPEN_STOCK'; symbol: string }
  /** state restored from the URL (back/forward) */
  | { type: 'ROUTE'; view: View; symbol: string | null }
  | { type: 'SELECT_HOT'; symbol: string }
  | { type: 'SET_FILTER'; filter: ActionFilter }
  | { type: 'SET_SORT'; sort: SortKey }
  | { type: 'TOGGLE_OVERLAY'; overlay: Overlay }
  | { type: 'SET_RANGE'; range: ChartRange }
  | { type: 'SET_KEY'; key: string }
  | { type: 'SIGNALS_LOADING' }
  | { type: 'SIGNALS_LOADED'; signals: SignalsFile }
  | { type: 'SIGNALS_ERROR'; message: string }
  | { type: 'QUOTES'; quotes: Record<string, LiveQuote>; ticks?: Record<string, Tick[]> }
  | { type: 'LIVE_STATUS'; status: LiveStatus; message?: string }
  | { type: 'MARKET_OPEN'; open: boolean }
  | { type: 'ADD_POSITION'; position: Position }
  | { type: 'TOGGLE_WATCH'; item: WatchItem }
  | { type: 'SET_COMPARE'; symbols: string[] }
  | { type: 'UPDATE_POSITION'; id: string; patch: Partial<Position> }
  | { type: 'REMOVE_POSITION'; id: string }
  | { type: 'IMPORT_POSITIONS'; positions: Position[] }
  | { type: 'SET_ACCOUNT'; size: number | null }

const KEY_STORAGE = 'kevision:finnhubKey'
const THEME_STORAGE = 'kevision:theme'
const OVERLAY_STORAGE = 'kevision:overlays'
const POSITIONS_STORAGE = 'kevision:positions'
const ACCOUNT_STORAGE = 'kevision:accountSize'
const WATCH_STORAGE = 'kevision:watchlist'
const COMPARE_STORAGE = 'kevision:compare'

function loadJson<T>(key: string, fallback: T, valid: (v: unknown) => boolean): T {
  try {
    const v = JSON.parse(load(key) ?? 'null')
    return valid(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}
const MAX_TICKS = 3000

function loadPositions(): Position[] {
  try {
    const parsed = JSON.parse(load(POSITIONS_STORAGE) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.symbol === 'string' && typeof p.buyPrice === 'number') : []
  } catch {
    return []
  }
}
const DEFAULT_OVERLAYS: Record<Overlay, boolean> = { sma20: false, sma50: true, sma200: false, levels: true }

function loadOverlays(): Record<Overlay, boolean> {
  try {
    return { ...DEFAULT_OVERLAYS, ...JSON.parse(load(OVERLAY_STORAGE) ?? '{}') }
  } catch {
    return DEFAULT_OVERLAYS
  }
}

/** The app was called Meridian before: move its saved data to the new names once, then drop the old keys. */
function migrateStorage() {
  try {
    const old: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('meridian:')) old.push(k)
    }
    for (const k of old) {
      const next = k.replace(/^meridian:/, 'kevision:')
      if (localStorage.getItem(next) == null) localStorage.setItem(next, localStorage.getItem(k) ?? '')
      localStorage.removeItem(k)
    }
  } catch {
    /* storage unavailable */
  }
}
migrateStorage()

function load(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function save(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}

const VIEWS: View[] = ['overview', 'stocks', 'watchlist', 'positions', 'hot', 'insiders', 'calendar', 'sectors', 'compare', 'journal', 'performance', 'glossary', 'more', 'settings']

/** #/stocks/NVDA -> { view: 'stocks', symbol: 'NVDA' } */
export function parseHash(hash: string): { view: View; symbol: string | null } {
  const [v, sym] = hash.replace(/^#\/?/, '').split('/')
  const view = (VIEWS as string[]).includes(v) ? (v as View) : 'overview'
  return { view, symbol: view === 'stocks' && sym ? decodeURIComponent(sym).toUpperCase() : null }
}

export function hashFor(state: Pick<AppState, 'view' | 'selected' | 'detail'>) {
  return state.view === 'stocks' && state.detail && state.selected ? `#/stocks/${encodeURIComponent(state.selected)}` : `#/${state.view}`
}

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function initialState(): AppState {
  const theme = (load(THEME_STORAGE) as Theme | null) ?? systemTheme()
  const route = parseHash(typeof location === 'undefined' ? '' : location.hash)
  return {
    theme,
    view: route.view,
    selected: route.symbol,
    detail: route.symbol != null,
    hotSelected: null,
    filter: 'all',
    sort: 'score',
    overlays: loadOverlays(),
    range: '6M',
    finnhubKey: (load(KEY_STORAGE) ?? import.meta.env.VITE_FINNHUB_KEY ?? '').trim(),
    signals: null,
    signalsError: null,
    signalsLoading: true,
    quotes: {},
    ticks: {},
    live: { status: 'no-key', marketOpen: null },
    positions: loadPositions(),
    accountSize: Number(load(ACCOUNT_STORAGE)) > 0 ? Number(load(ACCOUNT_STORAGE)) : null,
    watchlist: loadJson<WatchItem[]>(WATCH_STORAGE, [], (v) => Array.isArray(v) && v.every((x) => x && typeof x.symbol === 'string')),
    compare: loadJson<string[]>(COMPARE_STORAGE, [], (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')).slice(0, 3),
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    case 'SET_VIEW':
      return { ...state, view: action.view, detail: false }
    case 'SELECT':
      return { ...state, selected: action.symbol }
    case 'OPEN_STOCK':
      return { ...state, view: 'stocks', selected: action.symbol, detail: true }
    case 'ROUTE':
      return { ...state, view: action.view, selected: action.symbol ?? state.selected, detail: action.symbol != null }
    case 'SELECT_HOT':
      return { ...state, hotSelected: action.symbol }
    case 'SET_FILTER':
      return { ...state, filter: action.filter }
    case 'SET_SORT':
      return { ...state, sort: action.sort }
    case 'TOGGLE_OVERLAY':
      return { ...state, overlays: { ...state.overlays, [action.overlay]: !state.overlays[action.overlay] } }
    case 'SET_RANGE':
      return { ...state, range: action.range }
    case 'SET_KEY':
      return { ...state, finnhubKey: action.key.trim() }
    case 'SIGNALS_LOADING':
      return { ...state, signalsLoading: true }
    case 'SIGNALS_LOADED':
      return {
        ...state,
        signals: action.signals,
        signalsError: null,
        signalsLoading: false,
        selected: state.selected ?? action.signals.recommendations[0]?.symbol ?? null,
      }
    case 'SIGNALS_ERROR':
      return { ...state, signalsError: action.message, signalsLoading: false }
    case 'QUOTES': {
      let ticks = state.ticks
      if (action.ticks) {
        ticks = { ...state.ticks }
        for (const [sym, add] of Object.entries(action.ticks)) {
          const merged = [...(ticks[sym] ?? []), ...add]
          ticks[sym] = merged.length > MAX_TICKS ? merged.slice(-MAX_TICKS) : merged
        }
      }
      const quotes = { ...state.quotes }
      for (const [sym, q] of Object.entries(action.quotes)) {
        quotes[sym] = { ...quotes[sym], ...q, prevClose: q.prevClose ?? quotes[sym]?.prevClose }
      }
      return { ...state, quotes, ticks }
    }
    case 'LIVE_STATUS':
      return { ...state, live: { ...state.live, status: action.status, message: action.message } }
    case 'SET_ACCOUNT':
      return { ...state, accountSize: action.size && action.size > 0 ? action.size : null }
    case 'TOGGLE_WATCH':
      return state.watchlist.some((w) => w.symbol === action.item.symbol)
        ? { ...state, watchlist: state.watchlist.filter((w) => w.symbol !== action.item.symbol) }
        : { ...state, watchlist: [action.item, ...state.watchlist] }
    case 'SET_COMPARE':
      return { ...state, compare: [...new Set(action.symbols)].slice(0, 3) }
    case 'ADD_POSITION':
      return { ...state, positions: [action.position, ...state.positions] }
    case 'UPDATE_POSITION':
      return { ...state, positions: state.positions.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) }
    case 'REMOVE_POSITION':
      return { ...state, positions: state.positions.filter((p) => p.id !== action.id) }
    case 'IMPORT_POSITIONS': {
      // merge by id, imported rows win
      const byId = new Map(state.positions.map((p) => [p.id, p]))
      for (const p of action.positions) byId.set(p.id, p)
      return { ...state, positions: [...byId.values()].sort((a, b) => b.boughtAt.localeCompare(a.boughtAt)) }
    }
    case 'MARKET_OPEN':
      return { ...state, live: { ...state.live, marketOpen: action.open } }
    default:
      return state
  }
}

const StateCtx = createContext<AppState | null>(null)
const DispatchCtx = createContext<Dispatch<Action> | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => save(THEME_STORAGE, state.theme), [state.theme])
  useEffect(() => save(KEY_STORAGE, state.finnhubKey), [state.finnhubKey])
  useEffect(() => save(OVERLAY_STORAGE, JSON.stringify(state.overlays)), [state.overlays])
  useEffect(() => save(ACCOUNT_STORAGE, state.accountSize ? String(state.accountSize) : ''), [state.accountSize])
  useEffect(() => save(WATCH_STORAGE, state.watchlist.length ? JSON.stringify(state.watchlist) : ''), [state.watchlist])
  useEffect(() => save(COMPARE_STORAGE, state.compare.length ? JSON.stringify(state.compare) : ''), [state.compare])
  useEffect(() => save(POSITIONS_STORAGE, state.positions.length ? JSON.stringify(state.positions) : ''), [state.positions])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useAppState(): AppState {
  const ctx = useContext(StateCtx)
  if (!ctx) throw new Error('useAppState outside provider')
  return ctx
}

export function useAppDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchCtx)
  if (!ctx) throw new Error('useAppDispatch outside provider')
  return ctx
}
