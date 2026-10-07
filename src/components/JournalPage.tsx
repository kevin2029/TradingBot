import { useState } from 'react'
import { Card, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { Position } from '../types'
import { formatPct, formatPrice, prettyName } from '../utils/format'
import { tradingDaysBetween } from '../utils/positions'
import { PageHead, SectionHead } from './Page'

type Check = { text: string; ok: boolean }

interface Review {
  p: Position
  ret: number
  /** profit in units of the risk to the original stop */
  r: number | null
  days: number
  checks: Check[]
  followed: boolean
}

/** Grade one closed trade against the plan it was bought with. */
function review(p: Position): Review {
  const exit = p.closed!.price
  const ret = p.halfSold ? 0.5 * (p.halfSold.price / p.buyPrice - 1) + 0.5 * (exit / p.buyPrice - 1) : exit / p.buyPrice - 1
  const plan = p.plan
  const risk = plan && plan.stop < p.buyPrice ? p.buyPrice - plan.stop : null
  const r = risk ? (ret * p.buyPrice) / risk : null
  const days = tradingDaysBetween(p.boughtAt, new Date(`${p.closed!.at}T20:00:00Z`).getTime())
  const checks: Check[] = []
  if (plan) {
    if (plan.action === 'avoid') checks.push({ text: 'Bought while the plan said not to', ok: false })
    else if (p.buyPrice > plan.entryHigh * 1.01 && plan.action !== 'wait') checks.push({ text: `Chased: bought ${formatPct(p.buyPrice / plan.entryHigh - 1, 1)} above the entry zone`, ok: false })
    else checks.push({ text: plan.action === 'wait' ? 'Bought on the breakout' : 'Bought in the entry zone', ok: true })
    if (exit < plan.stop * 0.99 && !p.halfSold) checks.push({ text: `Sold ${formatPct(exit / plan.stop - 1, 1)} below the stop: the stop was not respected`, ok: false })
    else if (exit <= plan.stop * 1.01 && !p.halfSold) checks.push({ text: 'Stopped out at the stop, as planned', ok: true })
    if (p.halfSold) checks.push(p.halfSold.price >= plan.target1 * 0.99 ? { text: 'Took half at target 1', ok: true } : { text: 'Sold half before target 1', ok: false })
    else if (exit >= plan.target1 * 0.99) checks.push({ text: 'Reached target 1 but sold everything at once (plan: sell half, trail the rest)', ok: false })
    if (!p.halfSold && days > 30 && exit > plan.stop) checks.push({ text: `Held ${days} trading days without reaching target 1 (time stop is 30)`, ok: false })
  } else checks.push({ text: 'No plan saved with this trade', ok: false })
  return { p, ret, r, days, checks, followed: checks.every((c) => c.ok) }
}

export function JournalPage() {
  const { positions } = useAppState()
  const closed = positions.filter((p) => p.closed).sort((a, b) => b.closed!.at.localeCompare(a.closed!.at))
  const reviews = closed.map(review)
  const withR = reviews.filter((x) => x.r != null)
  const wins = reviews.filter((x) => x.ret > 0).length
  const avgR = withR.length ? withR.reduce((a, x) => a + x.r!, 0) / withR.length : null
  const followed = reviews.filter((x) => x.followed)
  const broken = reviews.filter((x) => !x.followed)
  const avgOf = (xs: Review[]) => (xs.filter((x) => x.r != null).length ? xs.filter((x) => x.r != null).reduce((a, x) => a + x.r!, 0) / xs.filter((x) => x.r != null).length : null)

  return (
    <main className="page">
      <PageHead title="Journal" sub="Your closed trades checked against the plan they were bought with. The track record tests the rules; this tests how you use them. Close a position on the Positions page to add it here." />

      {reviews.length === 0 ? (
        <Card padding={24}>
          <div className="t-headline" style={{ marginBottom: 6 }}>
            No closed trades yet
          </div>
          <div className="t-sub">When you close a position, it shows up here with its result in R (profit divided by the risk you took), whether you followed the plan, and room for a note on what you learned.</div>
        </Card>
      ) : (
        <>
          <Card padding={6}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}>
              <Big label="Trades" value={String(reviews.length)} />
              <Big label="Won" value={`${Math.round((wins / reviews.length) * 100)}%`} sub={`${wins} of ${reviews.length}`} />
              <Big label="Average result" value={avgR == null ? '—' : `${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R`} tone={avgR == null ? undefined : avgR >= 0 ? 'var(--up)' : 'var(--down)'} sub="per trade, R = profit / risk" />
              <Big label="Plan followed" value={`${Math.round((followed.length / reviews.length) * 100)}%`} sub={`${followed.length} of ${reviews.length} trades`} tone={followed.length >= reviews.length / 2 ? 'var(--up)' : 'var(--warn)'} />
            </div>
          </Card>

          {withR.length >= 2 && <EquityCurve reviews={withR.slice().reverse()} />}

          {followed.length > 0 && broken.length > 0 && (
            <div className="t-sub" style={{ background: 'var(--infosoft)', borderRadius: 12, padding: '12px 14px', color: 'var(--text)' }}>
              <b style={{ fontWeight: 600 }}>Following the plan</b>: {fmtR(avgOf(followed))} on average over {followed.length} trade{followed.length === 1 ? '' : 's'}. <b style={{ fontWeight: 600 }}>Breaking it</b>: {fmtR(avgOf(broken))} over {broken.length}.
            </div>
          )}

          <section>
            <SectionHead title="Trades" sub="Newest first" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.map((x) => (
                <TradeCard key={x.p.id} x={x} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}

const fmtR = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`)

function TradeCard({ x }: { x: Review }) {
  const dispatch = useAppDispatch()
  const [note, setNote] = useState(x.p.note ?? '')
  const saved = note === (x.p.note ?? '')
  const p = x.p
  return (
    <Card padding={18} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 650 }}>{p.symbol}</span> <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>{prettyName(p.name)}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: x.ret >= 0 ? 'var(--up)' : 'var(--down)', ...mono }}>{formatPct(x.ret, 1)}</div>
            <div className="t-caption" style={{ ...mono }}>{fmtR(x.r)}</div>
          </div>
        </div>
        <div className="t-sub" style={{ ...mono }}>
          Bought {formatPrice(p.buyPrice)} on {p.boughtAt}
          {p.halfSold ? `, half at ${formatPrice(p.halfSold.price)}` : ''}, sold {formatPrice(p.closed!.price)} on {p.closed!.at} · {x.days} trading days
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {x.checks.map((c) => (
            <li key={c.text} style={{ display: 'flex', gap: 8, fontSize: 14, lineHeight: 1.4 }}>
              <span style={{ color: c.ok ? 'var(--up)' : 'var(--down)', fontWeight: 700, width: 14, flexShrink: 0 }}>{c.ok ? '✓' : '✗'}</span>
              {c.text}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label className="t-caption" style={{ fontSize: 13 }} htmlFor={`note-${p.id}`}>
          What did you learn?
        </label>
        <textarea
          id={`note-${p.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why you bought, why you sold, what you would do differently"
          rows={4}
          style={{ width: '100%', resize: 'vertical', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--inset)', color: 'var(--text)', fontSize: 14, lineHeight: 1.45, padding: '10px 12px', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            disabled={saved}
            onClick={() => dispatch({ type: 'UPDATE_POSITION', id: p.id, patch: { note: note.trim() || undefined } })}
            style={{ height: 34, padding: '0 16px', borderRadius: 999, border: 'none', background: 'var(--info)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saved ? 'default' : 'pointer', opacity: saved ? 0.4 : 1 }}
          >
            {saved && p.note ? 'Saved' : 'Save note'}
          </button>
        </div>
      </div>
    </Card>
  )
}

/** Cumulative R over closed trades, oldest to newest. */
function EquityCurve({ reviews }: { reviews: Review[] }) {
  let sum = 0
  const pts = [0, ...reviews.map((x) => (sum += x.r!))]
  const min = Math.min(0, ...pts)
  const max = Math.max(0, ...pts)
  const span = max - min || 1
  const W = 100
  const H = 40
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, H - ((v - min) / span) * H] as const)
  const path = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const zeroY = H - ((0 - min) / span) * H
  const up = sum >= 0
  return (
    <Card padding={20}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div className="t-headline">Result over time</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: up ? 'var(--up)' : 'var(--down)', ...mono }}>{fmtR(sum)} total</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 140, display: 'block' }} aria-label="Cumulative result in R">
        <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="var(--border2)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
        <path d={`${path} L${W},${zeroY} L0,${zeroY} Z`} fill={up ? 'var(--upsoft)' : 'var(--downsoft)'} />
        <path d={path} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="t-caption" style={{ marginTop: 6 }}>
        Each step is one closed trade, in R. A rising line with small drops is what a working plan looks like.
      </div>
    </Card>
  )
}

function Big({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.02em', color: tone, ...mono }}>{value}</div>
      {sub && <div className="t-caption" style={{ fontSize: 12.5 }}>{sub}</div>}
    </div>
  )
}
