import type { AlertItem, AssetKey, PricePoint, Trade } from '../types'

/**
 * A market/broker feed adapter drives price, trade, alert, and latency events.
 * `simulationAdapter` implements this with a local random walk. A real adapter
 * (e.g. OANDA's v20 streaming + REST API) implements the same shape by pushing
 * events from websocket/REST responses instead of a timer, so swapping the
 * data source later doesn't require touching any UI or state-reducer code.
 */
export interface MarketFeedHandlers {
  onPrice: (asset: AssetKey, point: PricePoint) => void
  onTrade: (trade: Trade) => void
  onAlert: (alert: AlertItem) => void
  onLatency: (ms: number) => void
}

export interface MarketFeedAdapter {
  /** Begin streaming. Returns a cleanup function that stops all activity. */
  connect: (handlers: MarketFeedHandlers, isBotOn: () => boolean) => () => void
}
