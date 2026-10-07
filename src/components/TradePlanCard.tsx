import { Card, Eyebrow, mono } from '../ui/Primitives'
import type { PlanAction, TradePlan } from '../types'
import { formatPrice } from '../utils/format'

export const ACTION_META: Record<PlanAction, { label: string; color: string; soft: string }> = {
  'buy-now': { label: 'BUY NOW', color: 'var(--up)', soft: 'var(--upsoft)' },
  pullback: { label: 'BUY ON A DIP', color: 'var(--info)', soft: 'var(--infosoft)' },
  wait: { label: 'WAIT FOR BREAKOUT', color: 'var(--warn)', soft: 'var(--warnsoft)' },
  avoid: { label: "DON'T BUY", color: 'var(--down)', soft: 'var(--downsoft)' },
}

/** Where the live price sits relative to the plan. */
function liveStatus(plan: TradePlan, price: number): { text: string; color: string } {
  if (price >= plan.target2) return { text: 'Target 2 reached: sell the rest of the position', color: 'var(--up)' }
  if (price >= plan.target1) return { text: 'Target 1 reached: sell half, move stop to entry', color: 'var(--up)' }
  if (price <= plan.stop) return { text: 'Below the stop: exit if it closes here', color: 'var(--down)' }
  if (plan.action === 'avoid') return { text: 'No entry: signals are weak', color: 'var(--down)' }
  if (price >= plan.entryLow && price <= plan.entryHigh) return { text: 'Price is inside the entry zone now', color: 'var(--up)' }
  if (price > plan.entryHigh)
    return plan.action === 'wait'
      ? { text: 'Broke above the trigger: confirm with a daily close', color: 'var(--info)' }
      : { text: "Above the entry zone: don't chase, wait for a dip", color: 'var(--warn)' }
  return plan.action === 'wait'
    ? { text: 'Still below the breakout trigger: keep waiting', color: 'var(--warn)' }
    : { text: 'Below the entry zone: wait for it to stabilise', color: 'var(--warn)' }
}

const pctFrom = (v: number, base: number) => {
  const p = (v / base - 1) * 100
  return `${p >= 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}%`
}

export function TradePlanCard({ plan, price }: { plan: TradePlan; price: number }) {
  const meta = ACTION_META[plan.action]
  const status = liveStatus(plan, price)
  const entry = (plan.entryLow + plan.entryHigh) / 2

  return (
    <Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Position plan</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.soft, borderRadius: 999, padding: '4px 12px', ...mono }}>{meta.label}</span>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{plan.summary}</p>

      <RangeBar plan={plan} price={price} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <Level label="Stop loss" value={plan.stop} note={`${pctFrom(plan.stop, entry)} · sell all`} color="var(--down)" />
        <Level
          label={plan.action === 'wait' ? 'Buy above' : 'Entry zone'}
          value={plan.entryLow}
          valueHigh={plan.action === 'wait' ? undefined : plan.entryHigh}
          note={plan.action === 'wait' ? 'on a daily close' : 'buy here'}
          color="var(--info)"
        />
        <Level label="Target 1" value={plan.target1} note={`${pctFrom(plan.target1, entry)} · sell half`} color="var(--up)" />
        <Level label="Target 2" value={plan.target2} note={`${pctFrom(plan.target2, entry)} · sell rest`} color="var(--up)" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
        <span>
          <span style={{ color: 'var(--muted)', ...mono, fontSize: 11 }}>NOW {formatPrice(price)} · </span>
          {status.text}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        <Mini label="POSITION SIZE" value={`${Math.round(plan.positionPct * 100)}% of portfolio`} hint="Sized so hitting the stop costs about 1% of your account (max 20% in one stock)" />
        <Mini label="REWARD / RISK" value={`${plan.rewardRisk} : 1 at T1`} hint="Target 1 is twice as far from entry as the stop" />
        <Mini label="HOLDING" value={plan.holding} hint="Swing trade horizon" />
      </div>

      <div>
        <Eyebrow>When to sell</Eyebrow>
        <ol style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, lineHeight: 1.45 }}>
          {plan.exitRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>Mechanical rules from price and signals, not financial advice. Levels are recalculated every data refresh.</div>
    </Card>
  )
}

function Level({ label, value, valueHigh, note, color }: { label: string; value: number; valueHigh?: number; note: string; color: string }) {
  return (
    <div style={{ borderTop: `3px solid ${color}`, background: 'var(--inset)', borderRadius: '0 0 10px 10px', padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint)', letterSpacing: '.08em', textTransform: 'uppercase', ...mono }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', ...mono }}>
        {formatPrice(value)}
        {valueHigh != null && <span style={{ color: 'var(--muted)', fontSize: 12 }}> – {formatPrice(valueHigh)}</span>}
      </span>
      <span style={{ fontSize: 11, color: 'var(--muted)', ...mono }}>{note}</span>
    </div>
  )
}

function Mini({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div title={hint} style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint)', letterSpacing: '.08em', ...mono }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  )
}

/** Horizontal price track from stop to target 2, with the live price marker. */
function RangeBar({ plan, price }: { plan: TradePlan; price: number }) {
  const lo = Math.min(plan.stop, price) - plan.avgMove * 0.5
  const hi = Math.max(plan.target2, price) + plan.avgMove * 0.5
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
  const seg = (a: number, b: number, color: string) => (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: x(a), width: `calc(${x(b)} - ${x(a)})`, background: color }} />
  )
  const tick = (v: number, color: string) => <div style={{ position: 'absolute', top: -3, bottom: -3, left: x(v), width: 2, marginLeft: -1, background: color, borderRadius: 1 }} />
  return (
    <div style={{ padding: '18px 4px 4px' }} aria-hidden>
      <div style={{ position: 'relative', height: 10, borderRadius: 999, background: 'var(--inset)', border: '1px solid var(--border)' }}>
        {seg(plan.stop, plan.entryLow, 'var(--downsoft)')}
        {seg(plan.entryLow, plan.entryHigh, 'var(--info)')}
        {seg(plan.entryHigh, plan.target2, 'var(--upsoft)')}
        {tick(plan.stop, 'var(--down)')}
        {tick(plan.target1, 'var(--up)')}
        {tick(plan.target2, 'var(--up)')}
        <div style={{ position: 'absolute', top: -16, left: x(price), transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', ...mono }}>NOW</div>
        <div style={{ position: 'absolute', top: '50%', left: x(price), width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: '50%', background: 'var(--text)', border: '3px solid var(--surface)', boxShadow: '0 0 0 1px var(--border2)' }} />
      </div>
    </div>
  )
}
