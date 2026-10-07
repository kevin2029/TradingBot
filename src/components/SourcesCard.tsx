import { Card, StatusDot } from '../ui/Primitives'
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
  intraday: 'Intraday bars',
  earnings: 'Earnings calendar',
  ipos: 'IPO calendar',
}

export function SourcesCard() {
  const { signals } = useAppState()
  if (!signals) return null
  return (
    <Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span className="t-headline">Data sources</span>
        <span className="t-caption">Rebuilt hourly on weekdays</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 10 }}>
        {(Object.keys(LABELS) as SourceKey[]).map((k) => {
          const s = signals.sources[k]
          if (!s) return null
          return (
            <div key={k} title={s.error} style={{ background: 'var(--inset)', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusDot color={s.ok ? 'var(--up)' : 'var(--down)'} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{LABELS[k]}</span>
                <span className="t-caption" style={{ marginLeft: 'auto' }}>{s.ok ? timeAgo(s.fetchedAt) : 'Offline'}</span>
              </div>
              <a href={s.attribution.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                {s.attribution.label}
              </a>
              {s.error && <span style={{ fontSize: 12.5, color: 'var(--muted)', overflowWrap: 'anywhere' }}>{s.error}</span>}
              {s.note && <span style={{ fontSize: 12.5, color: 'var(--muted)', overflowWrap: 'anywhere' }}>{s.note}</span>}
            </div>
          )
        })}
      </div>
      <p className="t-caption" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        Disclosures are delayed by law: Congress members have up to 45 days to report a trade, insiders 2 business days. Live prices come from your own free Finnhub key.
        Scores are a mechanical summary of public data, not financial advice.
      </p>
    </Card>
  )
}
