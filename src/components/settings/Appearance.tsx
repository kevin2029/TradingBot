import { Card, SegmentedControl } from '../../ui/Primitives'
import { useAppDispatch, useAppState } from '../../state/store'
import type { Theme } from '../../types'

export function AppearanceToggle({ maxWidth = 320 }: { maxWidth?: number }) {
  const state = useAppState()
  const dispatch = useAppDispatch()
  return (
    <div style={{ maxWidth }}>
      <SegmentedControl<Theme>
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={state.theme}
        onChange={(t) => t !== state.theme && dispatch({ type: 'TOGGLE_THEME' })}
        height={30}
        fontSize={14}
      />
    </div>
  )
}

export function Appearance() {
  return (
    <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="t-headline">Appearance</div>
      <AppearanceToggle />
    </Card>
  )
}
