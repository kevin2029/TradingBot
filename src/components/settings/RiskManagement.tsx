import { Card, mono } from '../../ui/Primitives'
import { useAppDispatch, useAppState } from '../../state/store'
import type { RiskSettings } from '../../types'

interface SliderDef {
  key: keyof RiskSettings
  label: string
  min: number
  max: number
  step: number
  unit: string
  hint: string
}

const SLIDERS: SliderDef[] = [
  { key: 'size', label: 'Max position size', min: 1, max: 25, step: 0.5, unit: '% equity', hint: 'Cap on capital allocated to any single position.' },
  { key: 'loss', label: 'Daily loss limit', min: 0.5, max: 10, step: 0.5, unit: '%', hint: 'Bot halts and flattens all positions when breached.' },
  { key: 'stop', label: 'Stop loss', min: 0.25, max: 8, step: 0.25, unit: '%', hint: 'Per-trade protective exit.' },
  { key: 'take', label: 'Take profit', min: 0.5, max: 15, step: 0.5, unit: '%', hint: 'Per-trade target exit.' },
  { key: 'concurrent', label: 'Max concurrent positions', min: 1, max: 12, step: 1, unit: '', hint: 'Total simultaneous open positions across all assets.' },
]

export function RiskSliders({ columns = 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }: { columns?: string }) {
  const state = useAppState()
  const dispatch = useAppDispatch()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 20 }}>
      {SLIDERS.map((s) => {
        const value = state.risk[s.key]
        return (
          <div key={s.key}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)', ...mono }}>
                {value}
                {s.unit ? ` ${s.unit}` : ''}
              </span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={value}
              onChange={(e) => dispatch({ type: 'SET_RISK', key: s.key, value: Number(e.target.value) })}
              style={{ width: '100%', margin: '8px 0 0 0', accentColor: 'var(--info)' }}
            />
            <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 4 }}>{s.hint}</div>
          </div>
        )
      })}
    </div>
  )
}

export function RiskManagement() {
  return (
    <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Risk management</div>
      <RiskSliders />
    </Card>
  )
}
