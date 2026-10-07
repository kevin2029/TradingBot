import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import type { ActionFilter, ChartRange, LiveQuote, LiveStatus, Overlay, SignalsFile, SortKey, Theme, View } from '../types'

export interface Tick {
  t: number
  p: number
}

export interface AppState {
  theme: Theme
  view: View
  selected: string | null
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
}

export type Action =
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_VIEW'; view: View }
  | { type: 'SELECT'; symbol: string }
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

const KEY_STORAGE = 'meridian:finnhubKey'
const THEME_STORAGE = 'meridian:theme'
const OVERLAY_STORAGE = 'meridian:overlays'
const MAX_TICKS = 3000
const DEFAULT_OVERLAYS: Record<Overlay, boolean> = { sma20: false, sma50: true, sma200: false, levels: true }

function loadOverlays(): Record<Overlay, boolean> {
  try {
    return { ...DEFAULT_OVERLAYS, ...JSON.parse(load(OVERLAY_STORAGE) ?? '{}') }
  } catch {
    return DEFAULT_OVERLAYS
  }
}

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

function initialState(): AppState {
  const theme = (load(THEME_STORAGE) as Theme | null) ?? 'dark'
  return {
    theme,
    view: 'dashboard',
    selected: null,
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
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'SELECT':
      return { ...state, selected: action.symbol }
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
