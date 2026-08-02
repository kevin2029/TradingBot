import { ControlCard } from './ControlCard'
import { AccountCard } from './AccountCard'
import { SystemHealthCard } from './SystemHealthCard'
import { AssetCard } from './AssetCard'
import { FocusedChart } from './FocusedChart'
import { ActivityLog } from './ActivityLog'
import { OpenPositions } from './OpenPositions'
import { AlertsPanel } from './AlertsPanel'
import { ASSET_ORDER } from '../data/assets'

export function Dashboard() {
  return (
    <main style={{ maxWidth: 1560, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20 }}>
        <ControlCard />
        <AccountCard />
        <SystemHealthCard />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: 16 }}>
        {ASSET_ORDER.map((key) => (
          <AssetCard key={key} assetKey={key} />
        ))}
      </section>

      <section>
        <FocusedChart />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(540px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
        <ActivityLog />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <OpenPositions />
          <AlertsPanel />
        </div>
      </section>
    </main>
  )
}
