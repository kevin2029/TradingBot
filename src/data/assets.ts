import type { AssetDef, AssetKey } from '../types'

export const ASSETS: Record<AssetKey, AssetDef> = {
  XAG: { key: 'XAG', name: 'Silver', symbol: 'XAG/USD', base: 38.42, vol: 0.14, dollarPrefix: true, multiplier: 1 },
  XAU: { key: 'XAU', name: 'Gold', symbol: 'XAU/USD', base: 3418.6, vol: 4.2, dollarPrefix: true, multiplier: 1 },
  CL: { key: 'CL', name: 'Crude Oil', symbol: 'CL=F', base: 71.85, vol: 0.32, dollarPrefix: true, multiplier: 1 },
  SPX: { key: 'SPX', name: 'S&P 500', symbol: 'SPX', base: 6284.1, vol: 6.8, dollarPrefix: false, multiplier: 10 },
}

export const ASSET_ORDER: AssetKey[] = ['XAG', 'XAU', 'CL', 'SPX']

export const RANGE_WINDOWS: Record<string, number> = {
  '15M': 45,
  '1H': 90,
  '4H': 140,
  '1D': 181,
}
