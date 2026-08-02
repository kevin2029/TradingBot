import type { Mode } from '../types'

export interface BotStatus {
  label: 'ACTIVE' | 'LIVE' | 'INACTIVE'
  color: string
  pulse?: string
  sub: string
}

export function botStatus(botOn: boolean, mode: Mode): BotStatus {
  if (!botOn) {
    return { label: 'INACTIVE', color: 'var(--faint)', sub: 'No orders will be placed' }
  }
  if (mode === 'live') {
    return { label: 'LIVE', color: 'var(--down)', pulse: '1.8s', sub: 'Routing orders to exchange' }
  }
  return { label: 'ACTIVE', color: 'var(--up)', pulse: '1.8s', sub: 'Paper trading against live prices' }
}
