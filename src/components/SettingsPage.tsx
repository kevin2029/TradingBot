import { BrokerConnection } from './settings/BrokerConnection'
import { Execution } from './settings/Execution'
import { RiskManagement } from './settings/RiskManagement'
import { Notifications } from './settings/Notifications'
import { Appearance } from './settings/Appearance'
import { KillSwitch } from './settings/KillSwitch'

export function SettingsPage() {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.025em' }}>Settings</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
          Broker connectivity, execution, risk and account preferences.
        </div>
      </div>
      <BrokerConnection />
      <Execution />
      <RiskManagement />
      <Notifications />
      <Appearance />
      <KillSwitch />
    </main>
  )
}
