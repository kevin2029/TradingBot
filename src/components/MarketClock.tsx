import { useEffect, useState } from 'react'
import { mono } from '../ui/Primitives'
import { formatCountdown, formatLocal, marketClock, type Session } from '../utils/marketClock'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export const SESSION_META: Record<Session, { label: string; color: string; soft: string }> = {
  pre: { label: 'Pre-market', color: 'var(--info)', soft: 'var(--infosoft)' },
  regular: { label: 'Market open', color: 'var(--up)', soft: 'var(--upsoft)' },
  post: { label: 'After hours', color: 'var(--warn)', soft: 'var(--warnsoft)' },
  closed: { label: 'Closed', color: 'var(--muted)', soft: 'var(--inset)' },
}

/** Session pill + countdown to the next open/close in the viewer's local time. */
export function MarketClock() {
  const now = useNow(1000)
  const c = marketClock(now)
  const meta = SESSION_META[c.session]
  // Always show "opens in" and, while open, "closes in".
  const opensAt = c.session === 'regular' ? null : c.session === 'pre' ? c.next.at : c.next.label === 'Opens' ? c.next.at : null
  const closesAt = c.session === 'regular' ? c.next.at : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: meta.color, background: meta.soft, borderRadius: 999, padding: '3px 10px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, animation: c.session === 'closed' ? undefined : 'bp 1.6s infinite' }} />
        {meta.label}
        {c.earlyClose && ', early close'}
        {c.holiday && ', holiday'}
      </span>
      {opensAt && (
        <span>
          <span style={{ color: 'var(--muted)' }}>Opens in </span>
          <b style={mono}>{formatCountdown(opensAt - now)}</b>
          <span style={{ color: 'var(--faint)', ...mono }}> · {formatLocal(opensAt)}</span>
        </span>
      )}
      {closesAt && (
        <span>
          <span style={{ color: 'var(--muted)' }}>{c.earlyClose ? 'Closes early in ' : 'Closes in '}</span>
          <b style={mono}>{formatCountdown(closesAt - now)}</b>
          <span style={{ color: 'var(--faint)', ...mono }}> · {formatLocal(closesAt)}</span>
        </span>
      )}
      {c.session === 'post' && (
        <span>
          <span style={{ color: 'var(--muted)' }}>After hours end in </span>
          <b style={mono}>{formatCountdown(c.next.at - now)}</b>
        </span>
      )}
      {c.session === 'closed' && c.next.label === 'Pre-market starts' && (
        <span>
          <span style={{ color: 'var(--muted)' }}>Pre-market starts in </span>
          <b style={mono}>{formatCountdown(c.next.at - now)}</b>
        </span>
      )}
    </div>
  )
}
