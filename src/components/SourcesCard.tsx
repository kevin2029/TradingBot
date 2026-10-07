import { Card, StatusDot, mono } from '../ui/Primitives'
import { useAppState } from '../state/store'
import type { SourceKey } from '../types'
import { timeAgo } from '../utils/format'

const LABELS: Record<SourceKey, string> = {
  congress: 'Congress trades',
  insider: 'Insider trades',
  contracts: 'Gov contracts',
  lobbying: 'Lobbying',
  social: 'WSB mentions',
  prices: 'Daily prices',
}

export function SourcesCard() {
  const { signals } = useAppState()
  if (!signals) return null
  return (
    <Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Data sources</span>
        <span style={{ fontSize: 11, color: 'var(--faint)', ...mono }}>REBUILT HOURLY ON WEEKDAYS</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 10 }}>
        {(Object.keys(LABELS) as SourceKey[]).map((k) => {
          const s = signals.sources[k]
          if (!s) return null
          return (
            <div key={k} title={s.error} style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusDot color={s.ok ? 'var(--up)' : 'var(--down)'} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{LABELS[k]}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--faint)', ...mono }}>{s.ok ? timeAgo(s.fetchedAt) : 'OFFLINE'}</span>
              </div>
              <a href={s.attribution.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                {s.attribution.label}
              </a>
              {s.error && <span style={{ fontSize: 11.5, color: 'var(--muted)', overflowWrap: 'anywhere' }}>{s.error}</span>}
            </div>
          )
        })}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        Disclosures are delayed by law: Congress members have up to 45 days to report a trade, insiders 2 business days. Live prices come from your own free Finnhub key.
        Scores are a mechanical summary of public data, not financial advice.
      </p>
    </Card>
  )
}
