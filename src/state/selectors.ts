import { ASSETS } from '../data/assets'
import type { AppState } from './store'

export function lastPrice(state: AppState, asset: keyof typeof ASSETS): number {
  const pts = state.series[asset].pts
  return pts.length ? pts[pts.length - 1].p : ASSETS[asset].base
}

export function unrealizedPnl(state: AppState): number {
  return state.positions.reduce((sum, pos) => {
    const def = ASSETS[pos.asset]
    const mark = lastPrice(state, pos.asset)
    const diff = (mark - pos.entry) * pos.qty * def.multiplier
    return sum + (pos.side === 'LONG' ? diff : -diff)
  }, 0)
}

export function realizedPnl(state: AppState): number {
  return state.trades.reduce((sum, t) => sum + t.pnl, 0)
}

export function dayPnl(state: AppState): number {
  return realizedPnl(state) + unrealizedPnl(state)
}

export function equity(state: AppState): number {
  return state.equityBase + dayPnl(state)
}

export function buyingPower(state: AppState): number {
  return equity(state) * 1.85
}

export function winRate(state: AppState): number {
  if (state.trades.length === 0) return 0
  const winners = state.trades.filter((t) => t.pnl > 0).length
  return (winners / state.trades.length) * 100
}

export function profitFactor(state: AppState): number {
  const grossWin = state.trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss = state.trades.filter((t) => t.pnl < 0).reduce((s, t) => s + Math.abs(t.pnl), 0)
  if (grossLoss === 0) return grossWin > 0 ? grossWin : 0
  return grossWin / grossLoss
}
