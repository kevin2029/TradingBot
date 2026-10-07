// Shape of public/data/signals.json (written by scripts/build-signals.mjs).

export type SourceKey = 'congress' | 'insider' | 'contracts' | 'lobbying' | 'social' | 'prices'
export type ComponentKey = 'technical' | 'congress' | 'insider' | 'social' | 'contracts' | 'lobbying'
export type Rating = 'strong-buy' | 'buy' | 'watch' | 'avoid'
export type Regime = 'risk-on' | 'neutral' | 'risk-off'

/** [unix seconds, close] */
export type Bar = [number, number]

export interface SourceStatus {
  ok: boolean
  count: number
  fetchedAt: string
  error?: string
  attribution: { label: string; url: string }
}

export interface Technicals {
  last: number
  change1d: number
  ret20: number
  sma50: number | null
  sma200: number | null
  rsi14: number | null
  vol20: number
  history: Bar[]
}

export interface Benchmark extends Technicals {
  symbol: string
  name: string
}

export interface Component {
  score: number | null
  detail: string
}

export type PlanAction = 'buy-now' | 'pullback' | 'wait' | 'avoid'

export interface TradePlan {
  action: PlanAction
  summary: string
  entryLow: number
  entryHigh: number
  stop: number
  target1: number
  target2: number
  /** fraction of entry price at risk between entry and stop */
  riskPct: number
  rewardRisk: number
  /** suggested fraction of the portfolio when risking 1% of the account */
  positionPct: number
  avgMove: number
  holding: string
  exitRules: string[]
}

export interface Recommendation {
  symbol: string
  name: string
  score: number
  rating: Rating
  agreeing: number
  components: Record<ComponentKey, Component>
  reasons: string[]
  risks: string[]
  price: Technicals
  plan: TradePlan | null
}

export interface SignalsFile {
  version: 1
  generatedAt: string
  stale?: boolean
  weights: Record<ComponentKey, number>
  sources: Record<SourceKey, SourceStatus>
  market: { regime: Regime; summary: string; indices: Benchmark[] }
  recommendations: Recommendation[]
}

// ---- live prices (browser, Finnhub) ----------------------------------------

export interface LiveQuote {
  price: number
  /** previous close, used for the day change */
  prevClose?: number
  ts: number
}

export type LiveStatus = 'no-key' | 'connecting' | 'live' | 'closed' | 'error'

export type View = 'dashboard' | 'settings'
export type Theme = 'dark' | 'light'
export type ChartRange = '1D' | '1M' | '3M' | '6M' | '1Y'
export type RatingFilter = 'all' | 'buys' | Rating
export type ActionFilter = 'all' | PlanAction
export type SortKey = 'score' | 'upside' | 'change' | 'risk'
export type Overlay = 'sma20' | 'sma50' | 'sma200' | 'levels'
