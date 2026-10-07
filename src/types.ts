// Shape of public/data/signals.json (written by scripts/build-signals.mjs).

export type SourceKey = 'congress' | 'insider' | 'contracts' | 'lobbying' | 'social' | 'prices' | 'intraday' | 'earnings' | 'ipos'
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
  /** informational, e.g. data came from a fallback */
  note?: string
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
  /** v2 fields (missing in older files) */
  ret63?: number
  rs63?: number | null
  atr14?: number | null
  volume?: number
  volume20?: number
  /** 12 month return skipping the last month */
  mom12_1?: number | null
  /** price as a fraction of the 52 week high */
  high52prox?: number | null
  /** rank among all scored stocks, 0..1 */
  momPct?: number | null
  highPct?: number | null
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
  /** ATR (average true range) */
  avgMove: number
  holding: string
  exitRules: string[]
  /** v2 fields (missing in older files) */
  confirm?: string
  warnings?: string[]
  trailDistance?: number
  earnings?: { date: string; hour: string; days: number } | null
  /** earnings within a week: no new entry until after the report */
  earningsBlock?: boolean
  rs63?: number | null
  riskOff?: boolean
}

export interface BacktestStats {
  trades: number
  open?: number
  winRate?: number
  avgR?: number
  totalR?: number
  profitFactor?: number | null
  avgReturn?: number
  avgDays?: number
  maxLosingStreak?: number
  /** average return minus the S&P 500's over the same days */
  avgExcess?: number | null
  /** share of trades that beat the S&P 500 */
  beatSpy?: number | null
  bestR?: number
  worstR?: number
}

export interface Backtest {
  from: string | null
  to: string | null
  stocks: number
  overall: BacktestStats
  byAction: Record<'buy-now' | 'pullback' | 'wait', BacktestStats>
  /** default stop rule used for the plans */
  stopMode?: 'tight' | 'wide' | 'trend'
  /** same entries with other stops, plus random entries as a benchmark */
  variants?: Partial<Record<'tight' | 'wide' | 'trend' | 'random', BacktestStats & { label: string }>>
  /** buy and hold S&P 500 over the backtest period */
  spyReturn?: number | null
  note: string
}

export interface TrackHorizon {
  label: string
  picks: number
  avgReturn: number | null
  hitRate: number | null
  beatSpy: number | null
  avgExcess: number | null
}

export interface TrackRecord {
  since: string | null
  days: number
  totalPicks: number
  horizons: Record<'1w' | '4w' | '8w', TrackHorizon>
  recent: { date: string; symbol: string; action: string; score: number; price: number; now: number | null; ret: number | null }[]
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
  /** industry from Finnhub (v2) */
  sector?: string | null
  /** a recent IPO that has just enough history to be scored */
  newListing?: boolean
  /** part of the fixed universe (false = discovered via Congress, contracts or lobbying) */
  universe?: boolean
  /** backtest of the plan rules on this stock (v2) */
  backtest?: BacktestStats | null
}

export interface ExtendedSession {
  price: number
  /** unix seconds of the last bar */
  ts: number
  /** vs previous close (pre-market) or today's close (after-hours) */
  change: number
  high: number
  low: number
}

/** Today's 5 minute bars incl. pre-market and after-hours (Yahoo). Times are unix seconds. */
export interface Intraday {
  prevClose: number | null
  pre: ExtendedSession | null
  post: ExtendedSession | null
  regularClose: number | null
  periods: { pre: [number, number] | null; regular: [number, number] | null; post: [number, number] | null }
  bars: Bar[]
  /** last 5 trading days, 30 minute bars, regular session (missing in older files) */
  week?: Bar[]
}

export interface SignalsFile {
  version: 1
  generatedAt: string
  stale?: boolean
  weights: Record<ComponentKey, number>
  sources: Record<SourceKey, SourceStatus>
  market: { regime: Regime; summary: string; indices: Benchmark[] }
  recommendations: Recommendation[]
  /** missing in files built before the pre-market feature */
  intraday?: Record<string, Intraday>
  backtest?: Backtest
  track?: TrackRecord
  hot?: { items: HotStock[] }
  /** recent insider (Form 4) trades across the scored stocks */
  insiders?: { items: InsiderTrade[] }
  /** Congress trades, aggregated per stock (no raw rows) */
  congress?: { items: CongressTotal[] }
  ipos?: { lockupDays: number; minBars: number; items: NewListing[] }
}

/** Price summary for the Hot & volatile tab and new listings. */
export interface QuickPrice {
  last: number
  change1d: number
  ret20: number
  atr14: number | null
  /** average true range as a share of the price: typical daily swing */
  atrPct: number | null
  vol20: number
  volume: number
  volume20: number
  history: Bar[]
}

/** Score and rating when the stock is also in the normal ranking. */
export interface RankingRef {
  score: number
  rating: Rating
  action: PlanAction | null
}

export interface InsiderTrade {
  symbol: string
  company: string
  insider: string
  /** trade date and filing date (yyyy-mm-dd) */
  date: string
  filed: string
  /** P = open-market purchase, S = sale */
  code: 'P' | 'S'
  shares: number
  price: number
  value: number
  /** Cohen, Malloy & Pomorski: routine traders predict nothing, opportunistic ones do */
  kind: 'opportunistic' | 'routine' | 'unclassified'
  /** three or more insiders bought this stock in the last 90 days */
  cluster: boolean
}

export interface CongressTotal {
  symbol: string
  company: string
  buys: number
  sells: number
  buyers: number
  sellers: number
  leaders: string[]
  leaderBuys: number
  leaderSells: number
  latest: string | null
  net: number
  /** also in the ranking */
  ranked: boolean
}

/** A starred stock and what it looked like when you starred it. */
export interface WatchItem {
  symbol: string
  addedAt: string
  price: number | null
  score: number | null
  rating: Rating | null
  action: PlanAction | null
}

export interface HotStock {
  symbol: string
  name: string
  /** WSB mention rank, 1 = most mentioned */
  rank: number
  rank24h: number | null
  mentions: number
  mentions24h: number
  upvotes: number
  price: QuickPrice
  ranking: RankingRef | null
}

export interface NewListing {
  symbol: string | null
  name: string
  date: string
  exchange: string | null
  /** expected | priced | filed */
  status: string
  priceLow: number | null
  priceHigh: number | null
  shares: number | null
  dealValue: number | null
  lockupDate: string
  /** trading days with prices so far */
  listedDays: number
  firstClose: number | null
  price: QuickPrice | null
  ranking: RankingRef | null
}

// ---- live prices (browser, Finnhub) ----------------------------------------

export interface LiveQuote {
  price: number
  /** previous close, used for the day change */
  prevClose?: number
  ts: number
}

export type LiveStatus = 'no-key' | 'connecting' | 'live' | 'closed' | 'error'

export type View = 'overview' | 'stocks' | 'watchlist' | 'positions' | 'hot' | 'insiders' | 'calendar' | 'sectors' | 'compare' | 'journal' | 'performance' | 'glossary' | 'more' | 'settings'

/** A stock the user bought from a recommendation. Stored in this browser only. */
export interface Position {
  id: string
  symbol: string
  name: string
  /** ISO date (yyyy-mm-dd) */
  boughtAt: string
  buyPrice: number
  /** optional, enables money P&L */
  shares?: number
  /** plan levels at the moment of buying */
  plan: (Pick<TradePlan, 'stop' | 'target1' | 'target2' | 'entryLow' | 'entryHigh' | 'action'> & { trailDistance?: number }) | null
  /** industry at the moment of buying */
  sector?: string | null
  scoreAtBuy: number | null
  ratingAtBuy: Rating | null
  /** set when half was sold at target 1 */
  halfSold?: { price: number; at: string }
  /** set when the position is fully closed */
  closed?: { price: number; at: string }
  note?: string
}
export type Theme = 'dark' | 'light'
export type ChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y'
export type RatingFilter = 'all' | 'buys' | Rating
export type ActionFilter = 'all' | PlanAction
export type SortKey = 'score' | 'upside' | 'change' | 'risk' | 'volatile'
export type Overlay = 'sma20' | 'sma50' | 'sma200' | 'levels'
