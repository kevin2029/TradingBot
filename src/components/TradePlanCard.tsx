import { Card, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { PlanAction, Recommendation, TradePlan } from '../types'
import { BuyPanel } from './BuyPanel'
import { formatPrice } from '../utils/format'

export const ACTION_META: Record<PlanAction, { label: string; color: string; soft: string }> = {
  'buy-now': { label: 'Buy now', color: 'var(--up)', soft: 'var(--upsoft)' },
  pullback: { label: 'Buy on a dip', color: 'var(--info)', soft: 'var(--infosoft)' },
  wait: { label: 'Wait for breakout', color: 'var(--warn)', soft: 'var(--warnsoft)' },
  avoid: { label: "Don't buy", color: 'var(--down)', soft: 'var(--downsoft)' },
}

export const EARNINGS_META = { label: 'Wait for earnings', color: 'var(--warn)', soft: 'var(--warnsoft)' }

/** Where the live price sits relative to the plan. */
function liveStatus(plan: TradePlan, price: number): { text: string; color: string } {
  if (price >= plan.target2) return { text: 'Reference target reached: take more profit or keep trailing the stop', color: 'var(--up)' }
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

export function TradePlanCard({ plan, price, rec }: { plan: TradePlan; price: number; rec: Recommendation }) {
  const meta = plan.earningsBlock ? EARNINGS_META : ACTION_META[plan.action]
  const status = plan.earningsBlock
    ? { text: `Earnings in ${plan.earnings?.days ?? 0} days: no new entry until after the report`, color: 'var(--warn)' }
    : liveStatus(plan, price)
  const entry = (plan.entryLow + plan.entryHigh) / 2
  const { positions, signals } = useAppState()
  const dispatch = useAppDispatch()
  // concentration: open positions in the same industry
  const sectorOf = (sym: string) => signals?.recommendations.find((r) => r.symbol === sym)?.sector
  const sameSector = rec.sector
    ? positions.filter((p) => !p.closed && p.symbol !== rec.symbol && (p.sector ?? sectorOf(p.symbol)) === rec.sector)
    : []
  const bt = rec.backtest

  return (
    <Card padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="t-caption" style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em' }}>
          Position plan · {plan.holding}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', color: meta.color, marginTop: 4 }}>{meta.label}</div>
        <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5 }}>{plan.summary}</p>
      </div>

      {(plan.warnings?.length || sameSector.length > 0) && (
        <ul style={{ margin: 0, padding: '12px 14px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--warnsoft)', borderRadius: 12 }}>
          {plan.warnings?.map((w) => (
            <Warn key={w} text={w} />
          ))}
          {sameSector.length > 0 && <Warn text={`You already hold ${sameSector.length} ${rec.sector} stock${sameSector.length === 1 ? '' : 's'} (${sameSector.map((p) => p.symbol).join(', ')}): this adds to one bet`} />}
        </ul>
      )}

      {plan.confirm && plan.action !== 'avoid' && (
        <div style={{ fontSize: 14, lineHeight: 1.5, background: 'var(--infosoft)', borderRadius: 12, padding: '12px 14px' }}>
          <span style={{ fontWeight: 600, color: 'var(--info)' }}>How to enter. </span>
          {plan.confirm}
        </div>
      )}

      <div>
        <RangeBar plan={plan} price={price} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
          <span>
            <span style={{ color: 'var(--muted)', ...mono }}>Now {formatPrice(price)}. </span>
            {status.text}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 10 }}>
        <Level label="Stop loss" value={plan.stop} note={`${pctFrom(plan.stop, entry)}, sell all`} color="var(--down)" />
        <Level label={plan.action === 'wait' ? 'Buy above' : 'Entry zone'} value={plan.entryLow} valueHigh={plan.action === 'wait' ? undefined : plan.entryHigh} note={plan.action === 'wait' ? 'on a daily close' : 'buy here'} color="var(--info)" />
        <Level label="Target 1" value={plan.target1} note={`${pctFrom(plan.target1, entry)}, sell half`} color="var(--up)" />
        <Level label={plan.trailDistance ? 'Reference target' : 'Target 2'} value={plan.target2} note={plan.trailDistance ? `${pctFrom(plan.target2, entry)}, then trail` : `${pctFrom(plan.target2, entry)}, sell the rest`} color="var(--up)" />
      </div>

      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', columnGap: 28, margin: 0 }}>
        <Mini label="Position size" value={`${Math.round(plan.positionPct * 100)}% of portfolio${plan.riskOff ? ' (halved)' : ''}`} hint="Sized so hitting the stop costs about 1% of your account (max 20% in one stock, halved in a weak market)" />
        <Mini label="Reward to risk" value={`${plan.rewardRisk} to 1 at target 1`} hint="Target 1 is twice as far from entry as the stop" />
        <Mini label="Typical daily move" value={formatPrice(plan.avgMove)} hint="Average true range over 14 days. Stops and the trailing stop are based on it" />
        <Mini
          label="Backtest on this stock"
          value={bt && bt.trades ? `${bt.trades} trades, ${Math.round((bt.winRate ?? 0) * 100)}% won, ${(bt.avgR ?? 0) >= 0 ? '+' : ''}${bt.avgR}R` : 'Too few trades'}
          hint="These plan rules replayed on this stock's last 2 years (chart signal only, no costs). R = profit divided by the risk to the stop"
        />
      </dl>

      <div>
        <div className="t-headline">When to sell</div>
        <ol style={{ margin: '10px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: 1.5 }}>
          {plan.exitRules.map((r) => (
            <li key={r} style={{ paddingLeft: 4 }}>
              {r}
            </li>
          ))}
        </ol>
      </div>
      <div className="t-caption">
        Mechanical rules from price and signals, not financial advice. Levels are recalculated every data refresh.{' '}
        <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'glossary' })} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--info)', fontSize: 'inherit', cursor: 'pointer' }}>
          Terms explained
        </button>
      </div>
      <BuyPanel rec={rec} price={price} />
    </Card>
  )
}

function Level({ label, value, valueHigh, note, color }: { label: string; value: number; valueHigh?: number; note: string; color: string }) {
  return (
    <div style={{ background: 'var(--inset)', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
        {label}
      </span>
      <span style={{ fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '-.01em', ...mono }}>
        {formatPrice(value)}
        {valueHigh != null && <span style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}> to {formatPrice(valueHigh)}</span>}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--muted)', ...mono }}>{note}</span>
    </div>
  )
}

function Warn({ text }: { text: string }) {
  return (
    <li style={{ display: 'flex', gap: 8, fontSize: 14, lineHeight: 1.45 }}>
      <span style={{ color: 'var(--warn)', fontWeight: 700 }}>!</span>
      {text}
    </li>
  )
}

function Mini({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div title={hint} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '10px 0', borderTop: '1px solid var(--hairline)' }}>
      <dt style={{ fontSize: 14, color: 'var(--muted)' }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 14, fontWeight: 600, textAlign: 'right', ...mono }}>{value}</dd>
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
  const tick = (v: number, color: string) => <div style={{ position: 'absolute', top: -4, bottom: -4, left: x(v), width: 2, marginLeft: -1, background: color, borderRadius: 1 }} />
  return (
    <div style={{ padding: '20px 6px 4px' }} aria-hidden>
      <div style={{ position: 'relative', height: 6, borderRadius: 999, background: 'var(--seg-track)' }}>
        {seg(plan.stop, plan.entryLow, 'var(--downsoft)')}
        {seg(plan.entryLow, plan.entryHigh, 'var(--info)')}
        {seg(plan.entryHigh, plan.target2, 'var(--upsoft)')}
        {tick(plan.stop, 'var(--down)')}
        {tick(plan.target1, 'var(--up)')}
        {tick(plan.target2, 'var(--up)')}
        <div style={{ position: 'absolute', top: -19, left: x(price), transform: 'translateX(-50%)', fontSize: 11.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>Now</div>
        <div style={{ position: 'absolute', top: '50%', left: x(price), width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: '50%', background: 'var(--text)', border: '3px solid var(--surface)', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
      </div>
    </div>
  )
}
