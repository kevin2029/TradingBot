import { ASSETS, ASSET_ORDER } from './assets'
import type { MarketFeedAdapter } from './adapter'
import type { AssetKey } from '../types'
import { randInt, randRange, rnd } from '../utils/format'

const TICK_MS = 1400

function randomQty(asset: AssetKey): number {
  if (asset === 'XAG') return randInt(50, 150)
  if (asset === 'CL') return randInt(5, 20)
  return randInt(1, 4)
}

export const simulationAdapter: MarketFeedAdapter = {
  connect(handlers, isBotOn) {
    const last: Record<AssetKey, number> = {} as Record<AssetKey, number>
    for (const key of ASSET_ORDER) last[key] = ASSETS[key].base

    let tick = 0
    let tradeId = 1

    const interval = setInterval(() => {
      tick += 1

      for (const key of ASSET_ORDER) {
        const def = ASSETS[key]
        const next = last[key] + rnd(def.vol * 0.4) + (def.base - last[key]) * 0.008
        last[key] = next
        handlers.onPrice(key, { t: Date.now(), p: next })
      }

      handlers.onLatency(randInt(28, 62))

      if (isBotOn() && tick % 3 === 0) {
        const asset = ASSET_ORDER[randInt(0, ASSET_ORDER.length - 1)]
        const side = Math.random() < 0.52 ? 'BUY' : 'SELL'
        const price = last[asset] * (1 + rnd(0.0006))
        const win = Math.random() < 0.63
        const magnitude = randRange(40, 760)
        handlers.onTrade({
          id: tradeId++,
          ts: Date.now(),
          asset,
          side,
          qty: randomQty(asset),
          price,
          pnl: win ? magnitude : -magnitude,
        })
      }

      if (tick % 17 === 0) {
        const pool: Array<{ kind: 'SYSTEM' | 'RISK' | 'FEED' | 'SIGNAL' | 'FILL'; message: string }> = [
          { kind: 'SIGNAL', message: 'Strategy engine flagged a new entry signal on Gold (XAU/USD).' },
          { kind: 'FILL', message: 'Order filled: BUY 2 S&P 500 @ market.' },
          { kind: 'RISK', message: 'Daily loss limit at 62% of threshold.' },
          { kind: 'FEED', message: 'Market data feed briefly delayed (140ms), recovered automatically.' },
          { kind: 'SYSTEM', message: 'Strategy engine re-evaluated open positions against updated risk limits.' },
        ]
        const pick = pool[randInt(0, pool.length - 1)]
        handlers.onAlert({ id: Date.now() + Math.random(), ts: Date.now(), kind: pick.kind, message: pick.message })
      }
    }, TICK_MS)

    return () => clearInterval(interval)
  },
}
