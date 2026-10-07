import type { ReactNode } from 'react'
import { Card } from '../ui/Primitives'
import { useAppState } from '../state/store'
import { MISSING } from '../data/useSignals'
import { timeAgo } from '../utils/format'

/** Page title block: big title, one line of context, optional controls on the right. */
export function PageHead({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div style={{ minWidth: 0 }}>
        <h1 className="t-display" style={{ margin: 0 }}>
          {title}
        </h1>
        {sub && (
          <div className="t-sub" style={{ marginTop: 6, maxWidth: 720 }}>
            {sub}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

/** Section title inside a page. */
export function SectionHead({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <div>
        <h2 className="t-title" style={{ margin: 0, fontSize: 20 }}>
          {title}
        </h2>
        {sub && <div className="t-caption" style={{ marginTop: 3, fontSize: 13 }}>{sub}</div>}
      </div>
      {action}
    </div>
  )
}

/** A quiet "updated 3 min ago" line. */
export function Freshness() {
  const { signals } = useAppState()
  if (!signals) return null
  return (
    <span className="t-caption">
      Signals updated {timeAgo(signals.generatedAt)}
      {signals.stale ? ' (stale)' : ''}
    </span>
  )
}

/** Renders children once signals are loaded, otherwise a loading / empty / error card. */
export function NeedsSignals({ children }: { children: ReactNode }) {
  const state = useAppState()
  if (state.signals) return <>{children}</>
  return (
    <main className="page">
      <Card padding={28}>
        {state.signalsLoading ? (
          <div className="t-headline">Loading signals…</div>
        ) : state.signalsError === MISSING ? (
          <NoDataYet />
        ) : (
          <>
            <div className="t-headline" style={{ marginBottom: 8 }}>
              Could not load signals
            </div>
            <div className="t-sub">{state.signalsError}</div>
          </>
        )}
      </Card>
    </main>
  )
}

function NoDataYet() {
  const code = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, background: 'var(--inset)', borderRadius: 6, padding: '2px 6px' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
      <div className="t-headline" style={{ color: 'var(--text)' }}>
        {import.meta.env.DEV ? 'Fetching market data…' : 'No signals yet'}
      </div>
      {import.meta.env.DEV ? (
        <>
          <div>The dev server is fetching the public data and scoring stocks. The first run takes a few minutes; this page fills in by itself.</div>
          <div>
            Follow progress in the terminal running <span style={code}>npm run dev</span> (lines starting with <span style={code}>[signals]</span>).
          </div>
        </>
      ) : (
        <div>The data appears after the first scheduled GitHub Actions run.</div>
      )}
    </div>
  )
}

export function Footer() {
  return (
    <footer className="t-caption" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px calc(var(--tabbar-h) + 32px)', lineHeight: 1.6 }}>
      For research only, not financial advice. Congress trade data by{' '}
      <a href="https://www.bargo.ai/free-apis/congress" target="_blank" rel="noreferrer">
        Bargo
      </a>
      , WSB data by{' '}
      <a href="https://apewisdom.io" target="_blank" rel="noreferrer">
        ApeWisdom
      </a>
      , live prices by{' '}
      <a href="https://finnhub.io" target="_blank" rel="noreferrer">
        Finnhub
      </a>
      .
    </footer>
  )
}
