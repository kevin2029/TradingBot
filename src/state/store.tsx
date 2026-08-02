import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type {
  AlertItem,
  AssetKey,
  Broker,
  BrokerEnv,
  Connection,
  Currency,
  Interval,
  Mode,
  NotificationSettings,
  OrderType,
  Position,
  PricePoint,
  Range,
  RiskSettings,
  SeriesState,
  Side,
  Strategy,
  Theme,
  ToggleSettings,
  Trade,
  View,
} from '../types'
import { ASSET_ORDER, ASSETS } from '../data/assets'
import { rnd } from '../utils/format'

export interface AppState {
  theme: Theme
  mode: Mode
  botOn: boolean
  view: View
  settingsOpen: boolean
  confirmOpen: boolean
  focus: AssetKey
  range: Range
  hover: number | null
  series: Record<AssetKey, SeriesState>
  trades: Trade[]
  positions: Position[]
  alerts: AlertItem[]
  filterAsset: 'all' | AssetKey
  filterSide: 'all' | Side
  strategy: Strategy
  interval: Interval
  orderType: OrderType
  currency: Currency
  risk: RiskSettings
  toggles: ToggleSettings
  notifs: NotificationSettings
  broker: Broker
  brokerEnv: BrokerEnv
  accountId: string
  endpoint: string
  apiKey: string
  apiSecret: string
  webhook: string
  showSecret: boolean
  conn: Connection
  latency: number
  startedAt: number
  equityBase: number
}

function seedSeries(base: number, vol: number, now: number): SeriesState {
  const pts: PricePoint[] = []
  let last = base
  const start = now - 180 * 20_000
  for (let i = 0; i < 181; i++) {
    last = last + rnd(vol * 0.4) + (base - last) * 0.008
    pts.push({ t: start + i * 20_000, p: last })
  }
  return { open: base, pts }
}

function initialState(): AppState {
  const now = Date.now()
  const series = {} as Record<AssetKey, SeriesState>
  for (const key of ASSET_ORDER) {
    const def = ASSETS[key]
    series[key] = seedSeries(def.base, def.vol, now)
  }
  return {
    theme: 'dark',
    mode: 'sandbox',
    botOn: false,
    view: 'dashboard',
    settingsOpen: false,
    confirmOpen: false,
    focus: 'XAG',
    range: '1H',
    hover: null,
    series,
    trades: [],
    positions: [
      { id: 1, asset: 'XAU', side: 'LONG', qty: 4, entry: 3402.15 },
      { id: 2, asset: 'CL', side: 'SHORT', qty: 20, entry: 72.94 },
      { id: 3, asset: 'SPX', side: 'LONG', qty: 2, entry: 6251.8 },
      { id: 4, asset: 'XAG', side: 'LONG', qty: 150, entry: 37.88 },
    ],
    alerts: [],
    filterAsset: 'all',
    filterSide: 'all',
    strategy: 'ma',
    interval: '5m',
    orderType: 'market',
    currency: 'USD',
    risk: { size: 8, loss: 2.5, stop: 1.5, take: 3.5, concurrent: 4 },
    toggles: { trailing: true, hours: false, hedge: false },
    notifs: { fills: true, risk: true, digest: false },
    broker: 'oanda',
    brokerEnv: 'paper',
    accountId: '',
    endpoint: '',
    apiKey: '',
    apiSecret: '',
    webhook: '',
    showSecret: false,
    conn: 'disconnected',
    latency: 34,
    startedAt: now,
    equityBase: 128_450,
  }
}

export type Action =
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_BOT' }
  | { type: 'PICK_SANDBOX' }
  | { type: 'OPEN_LIVE_CONFIRM' }
  | { type: 'CLOSE_LIVE_CONFIRM' }
  | { type: 'CONFIRM_LIVE' }
  | { type: 'SET_VIEW'; view: View }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'SET_FOCUS'; asset: AssetKey }
  | { type: 'SET_RANGE'; range: Range }
  | { type: 'SET_HOVER'; hover: number | null }
  | { type: 'PRICE_TICK'; asset: AssetKey; point: PricePoint }
  | { type: 'ADD_TRADE'; trade: Trade }
  | { type: 'ADD_ALERT'; alert: AlertItem }
  | { type: 'SET_LATENCY'; value: number }
  | { type: 'SET_FILTER_ASSET'; value: 'all' | AssetKey }
  | { type: 'SET_FILTER_SIDE'; value: 'all' | Side }
  | { type: 'SET_STRATEGY'; value: Strategy }
  | { type: 'SET_INTERVAL'; value: Interval }
  | { type: 'SET_ORDER_TYPE'; value: OrderType }
  | { type: 'SET_CURRENCY'; value: Currency }
  | { type: 'TOGGLE_EXEC_TOGGLE'; key: keyof ToggleSettings }
  | { type: 'SET_RISK'; key: keyof RiskSettings; value: number }
  | { type: 'TOGGLE_NOTIF'; key: keyof NotificationSettings }
  | { type: 'SET_BROKER'; value: Broker }
  | { type: 'SET_BROKER_ENV'; value: BrokerEnv }
  | { type: 'SET_FIELD'; field: 'accountId' | 'endpoint' | 'apiKey' | 'apiSecret' | 'webhook'; value: string }
  | { type: 'TOGGLE_SHOW_SECRET' }
  | { type: 'SET_CONN'; value: Connection }
  | { type: 'KILL_SWITCH' }

function makeAlert(kind: AlertItem['kind'], message: string): AlertItem {
  return { id: Date.now() + Math.random(), ts: Date.now(), kind, message }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    case 'TOGGLE_BOT':
      return { ...state, botOn: !state.botOn }
    case 'PICK_SANDBOX':
      return { ...state, mode: 'sandbox' }
    case 'OPEN_LIVE_CONFIRM':
      return { ...state, confirmOpen: true }
    case 'CLOSE_LIVE_CONFIRM':
      return { ...state, confirmOpen: false }
    case 'CONFIRM_LIVE':
      return { ...state, mode: 'live', confirmOpen: false }
    case 'SET_VIEW':
      return { ...state, view: action.view, settingsOpen: false }
    case 'OPEN_DRAWER':
      return { ...state, settingsOpen: true }
    case 'CLOSE_DRAWER':
      return { ...state, settingsOpen: false }
    case 'SET_FOCUS':
      return { ...state, focus: action.asset, hover: null }
    case 'SET_RANGE':
      return { ...state, range: action.range, hover: null }
    case 'SET_HOVER':
      return { ...state, hover: action.hover }
    case 'PRICE_TICK': {
      const cur = state.series[action.asset]
      const pts = [...cur.pts, action.point].slice(-400)
      return { ...state, series: { ...state.series, [action.asset]: { ...cur, pts } } }
    }
    case 'ADD_TRADE':
      return { ...state, trades: [action.trade, ...state.trades].slice(0, 60) }
    case 'ADD_ALERT':
      return { ...state, alerts: [action.alert, ...state.alerts].slice(0, 20) }
    case 'SET_LATENCY':
      return { ...state, latency: action.value }
    case 'SET_FILTER_ASSET':
      return { ...state, filterAsset: action.value }
    case 'SET_FILTER_SIDE':
      return { ...state, filterSide: action.value }
    case 'SET_STRATEGY':
      return { ...state, strategy: action.value }
    case 'SET_INTERVAL':
      return { ...state, interval: action.value }
    case 'SET_ORDER_TYPE':
      return { ...state, orderType: action.value }
    case 'SET_CURRENCY':
      return { ...state, currency: action.value }
    case 'TOGGLE_EXEC_TOGGLE':
      return { ...state, toggles: { ...state.toggles, [action.key]: !state.toggles[action.key] } }
    case 'SET_RISK':
      return { ...state, risk: { ...state.risk, [action.key]: action.value } }
    case 'TOGGLE_NOTIF':
      return { ...state, notifs: { ...state.notifs, [action.key]: !state.notifs[action.key] } }
    case 'SET_BROKER':
      return { ...state, broker: action.value, conn: 'disconnected' }
    case 'SET_BROKER_ENV':
      return { ...state, brokerEnv: action.value }
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'TOGGLE_SHOW_SECRET':
      return { ...state, showSecret: !state.showSecret }
    case 'SET_CONN':
      return { ...state, conn: action.value }
    case 'KILL_SWITCH':
      return {
        ...state,
        botOn: false,
        mode: 'sandbox',
        alerts: [
          makeAlert('SYSTEM', 'Kill switch engaged — engine halted, working orders cancelled, positions flattened.'),
          ...state.alerts,
        ].slice(0, 20),
      }
    default:
      return state
  }
}

const StateContext = createContext<AppState | null>(null)
const DispatchContext = createContext<Dispatch<Action> | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const memoState = useMemo(() => state, [state])
  return (
    <StateContext.Provider value={memoState}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  )
}

export function useAppState(): AppState {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

export function useAppDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchContext)
  if (!ctx) throw new Error('useAppDispatch must be used within AppStateProvider')
  return ctx
}
