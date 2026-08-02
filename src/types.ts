export type AssetKey = 'XAG' | 'XAU' | 'CL' | 'SPX'

export interface AssetDef {
  key: AssetKey
  name: string
  symbol: string
  base: number
  vol: number
  dollarPrefix: boolean
  multiplier: number
}

export interface PricePoint {
  t: number
  p: number
}

export interface SeriesState {
  open: number
  pts: PricePoint[]
}

export type Side = 'BUY' | 'SELL'

export interface Trade {
  id: number
  ts: number
  asset: AssetKey
  side: Side
  qty: number
  price: number
  pnl: number
}

export type PositionSide = 'LONG' | 'SHORT'

export interface Position {
  id: number
  asset: AssetKey
  side: PositionSide
  qty: number
  entry: number
}

export type AlertKind = 'SYSTEM' | 'RISK' | 'FEED' | 'SIGNAL' | 'FILL'

export interface AlertItem {
  id: number
  ts: number
  kind: AlertKind
  message: string
}

export type Mode = 'sandbox' | 'live'
export type View = 'dashboard' | 'settings'
export type Range = '15M' | '1H' | '4H' | '1D'
export type Theme = 'dark' | 'light'
export type Strategy = 'ma' | 'rsi' | 'bb'
export type Interval = '1m' | '5m' | '15m' | '1h'
export type OrderType = 'market' | 'limit' | 'twap'
export type Currency = 'USD' | 'EUR' | 'GBP'
export type Broker = 'ibkr' | 'alpaca' | 'oanda' | 'tradovate' | 'binance' | 'custom'
export type BrokerEnv = 'paper' | 'prod'
export type Connection = 'connected' | 'testing' | 'disconnected'

export interface RiskSettings {
  size: number
  loss: number
  stop: number
  take: number
  concurrent: number
}

export interface ToggleSettings {
  trailing: boolean
  hours: boolean
  hedge: boolean
}

export interface NotificationSettings {
  fills: boolean
  risk: boolean
  digest: boolean
}
