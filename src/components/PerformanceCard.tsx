import { Card, Eyebrow, mono, prettyLabel } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { Backtest, BacktestStats } from '../types'
import { formatPct, formatPrice } from '../utils/format'
import { ACTION_META } from './TradePlanCard'

const pctOf = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`)
const rOf = (v: number | null | undefined) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`)
const color = (v: number | null | undefined) => (v == null ? undefined : v >= 0 ? 'var(--up)' : 'var(--down)')

/** How well the rules did: backtest of the plan rules + live track record of the recommendations. */
export function PerformanceCard() {
  const { signals } = useAppState()
  const dispatch = useAppDispatch()
  const bt = signals?.backtest
  const tr = signals?.track
  if (!bt && !tr) return null

  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
      {bt && (
        <Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="t-headline">Backtest of the plan rules</div>
            <div className="t-sub" style={{ marginTop: 4 }}>
              {bt.stocks} stocks, {bt.from} to {bt.to}. R = profit divided by the risk to the stop, so +1R means you made what you risked.
            </div>
          </div>
          <Stats s={bt.overall} />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'left' }}>
                {['BUY TYPE', 'TRADES', 'WON', 'AVG', 'TOTAL', 'AVG DAYS'].map((h) => (
                  <th key={h} style={{ padding: '8px 8px', fontWeight: 500 }}>{prettyLabel(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['buy-now', 'pullback', 'wait'] as const).map((a) => {
                const s = bt.byAction[a]
                return (
                  <tr key={a} style={{ borderTop: '1px solid var(--hairline)' }}>
                    <td style={{ ...cell, color: ACTION_META[a].color, fontWeight: 600 }}>{ACTION_META[a].label}</td>
                    <td style={{ ...cell, ...mono }}>{s?.trades ?? 0}</td>
                    <td style={{ ...cell, ...mono }}>{pctOf(s?.winRate)}</td>
                    <td style={{ ...cell, ...mono, color: color(s?.avgR), fontWeight: 600 }}>{rOf(s?.avgR)}</td>
                    <td style={{ ...cell, ...mono, color: color(s?.totalR) }}>{s?.totalR != null ? `${s.totalR >= 0 ? '+' : ''}${s.totalR}R` : '—'}</td>
                    <td style={{ ...cell, ...mono }}>{s?.avgDays ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {bt.variants && <Variants bt={bt} />}
          <div className="t-caption" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{bt.note}</div>
        </Card>
      )}

      {tr && (
        <Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="t-headline">Track record</div>
            <div className="t-sub" style={{ marginTop: 4 }}>
              Every trading day the Buy recommendations are logged and checked later against the S&P 500.
              {tr.since ? ` Since ${tr.since}: ${tr.days} day${tr.days === 1 ? '' : 's'}, ${tr.totalPicks} picks.` : ''}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'left' }}>
                {['AFTER', 'PICKS', 'AVG RETURN', 'UP', 'BEAT S&P', 'VS S&P'].map((h) => (
                  <th key={h} style={{ padding: '8px 8px', fontWeight: 500 }}>{prettyLabel(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['1w', '4w', '8w'] as const).map((k) => {
                const h = tr.horizons[k]
                return (
                  <tr key={k} style={{ borderTop: '1px solid var(--hairline)' }}>
                    <td style={{ ...cell, fontWeight: 600 }}>{h.label}</td>
                    <td style={{ ...cell, ...mono }}>{h.picks}</td>
                    <td style={{ ...cell, ...mono, color: color(h.avgReturn), fontWeight: 600 }}>{h.avgReturn == null ? '—' : formatPct(h.avgReturn, 1)}</td>
                    <td style={{ ...cell, ...mono }}>{pctOf(h.hitRate)}</td>
                    <td style={{ ...cell, ...mono }}>{pctOf(h.beatSpy)}</td>
                    <td style={{ ...cell, ...mono, color: color(h.avgExcess) }}>{h.avgExcess == null ? '—' : formatPct(h.avgExcess, 1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {tr.horizons['1w'].picks === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Collecting: the first results appear one week (5 trading days) after the first logged picks.</div>
          )}
          {tr.recent.length > 0 && (
            <div>
              <Eyebrow>Latest picks</Eyebrow>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {tr.recent.map((r) => (
                  <button className="tap"
                    key={`${r.date}-${r.symbol}`}
                    onClick={() => dispatch({ type: 'OPEN_STOCK', symbol: r.symbol })}
                    title={`Picked ${r.date} at ${formatPrice(r.price)} (score ${r.score})`}
                    style={{ display: 'flex', gap: 6, alignItems: 'baseline', border: 'none', background: 'var(--seg-track)', color: 'var(--text)', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontSize: 13.5 }}
                  >
                    <b style={{ fontWeight: 600 }}>{r.symbol}</b>
                    <span style={{ color: 'var(--faint)', fontSize: 12, ...mono }}>{r.date.slice(5)}</span>
                    <span style={{ color: color(r.ret), fontWeight: 600, ...mono }}>{r.ret == null ? '—' : formatPct(r.ret, 1)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </section>
  )
}

const cell = { padding: '10px 8px', whiteSpace: 'nowrap', fontSize: 14 } as const

/** Same signals with other stop rules, random entries and buy-and-hold S&P 500: is the plan better than chance? */
function Variants({ bt }: { bt: Backtest }) {
  const rows = (['wide', 'tight', 'trend', 'random'] as const).filter((k) => bt.variants?.[k])
  return (
    <div>
      <Eyebrow>Compared with</Eyebrow>
      <div style={{ overflowX: 'auto', marginTop: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'left' }}>
              {['RULE', 'TRADES', 'WON', 'AVG', 'VS S&P', 'BEAT S&P'].map((h) => (
                <th key={h} style={{ padding: '8px 8px', fontWeight: 500 }}>{prettyLabel(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => {
              const s = bt.variants![k]!
              const used = k === bt.stopMode
              return (
                <tr key={k} style={{ borderTop: '1px solid var(--hairline)', background: used ? 'var(--inset)' : undefined }}>
                  <td style={{ ...cell, fontWeight: used ? 700 : 500 }}>
                    {s.label}
                    {used && <span style={{ color: 'var(--info)', fontSize: 12.5, fontWeight: 500, marginLeft: 6 }}>In use</span>}
                  </td>
                  <td style={{ ...cell, ...mono }}>{s.trades}</td>
                  <td style={{ ...cell, ...mono }}>{pctOf(s.winRate)}</td>
                  <td style={{ ...cell, ...mono, color: color(s.avgR), fontWeight: 600 }}>{rOf(s.avgR)}</td>
                  <td style={{ ...cell, ...mono, color: color(s.avgExcess) }}>{s.avgExcess == null ? '—' : formatPct(s.avgExcess, 1)}</td>
                  <td style={{ ...cell, ...mono }}>{pctOf(s.beatSpy)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {bt.spyReturn != null && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          Buy and hold S&P 500 over the same period: <b style={{ color: color(bt.spyReturn), ...mono }}>{formatPct(bt.spyReturn, 1)}</b>. If the rule in use does not beat random entries, the signal adds little.
        </div>
      )}
    </div>
  )
}

function Stats({ s }: { s: BacktestStats }) {
  const items: [string, string, string | undefined][] = [
    ['TRADES', String(s.trades), undefined],
    ['WON', pctOf(s.winRate), undefined],
    ['AVG PER TRADE', rOf(s.avgR), color(s.avgR)],
    ['PROFIT FACTOR', s.profitFactor == null ? '—' : s.profitFactor.toFixed(2), s.profitFactor == null ? undefined : s.profitFactor >= 1 ? 'var(--up)' : 'var(--down)'],
    ['WORST STREAK', s.maxLosingStreak != null ? `${s.maxLosingStreak} losses` : '—', undefined],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 4 }}>
      {items.map(([l, v, c]) => (
        <div key={l} style={{ padding: '4px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{prettyLabel(l)}</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', marginTop: 2, color: c, ...mono }}>{v}</div>
        </div>
      ))}
    </div>
  )
}
