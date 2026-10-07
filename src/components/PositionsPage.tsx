import { useRef, useState } from 'react'
import { Card, Chip, inputStyle, mono, prettyLabel } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { Position } from '../types'
import { formatPct, formatPrice, prettyName } from '../utils/format'
import { PageHead } from './Page'
import { MAX_OPEN_RISK, evaluatePosition, portfolioRisk, todayIso, type PositionView } from '../utils/positions'
import { RATING_META } from '../utils/signals'
import { btn } from './BuyPanel'

function money(v: number) {
  const sign = v < 0 ? '−' : '+'
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function PositionsPage() {
  const { positions, quotes, signals, accountSize } = useAppState()
  const dispatch = useAppDispatch()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const views = positions.map((p) =>
    evaluatePosition(
      p,
      quotes[p.symbol]?.price,
      signals?.recommendations.find((r) => r.symbol === p.symbol),
    ),
  )
  const open = views.filter((v) => !v.position.closed)
  const closed = views.filter((v) => v.position.closed)

  const openWithPnl = open.filter((v) => v.pnlPct != null)
  const avgOpen = openWithPnl.length ? openWithPnl.reduce((a, v) => a + (v.pnlPct ?? 0), 0) / openWithPnl.length : null
  const openUsd = open.reduce((a, v) => a + (v.pnlUsd ?? 0), 0)
  const hasUsd = open.some((v) => v.pnlUsd != null) || closed.some((v) => v.pnlUsd != null)
  const closedUsd = closed.reduce((a, v) => a + (v.pnlUsd ?? 0), 0)
  const wins = closed.filter((v) => (v.pnlPct ?? 0) > 0).length
  const risk = portfolioRisk(views, accountSize)
  const needsAction = open.filter((v) => ['stop', 'target1', 'target2', 'weak'].includes(v.status.key)).length

  function exportJson() {
    const blob = new Blob([JSON.stringify({ app: 'kevision', version: 1, positions }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kevision-positions-${todayIso()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      const rows: Position[] = (Array.isArray(parsed) ? parsed : parsed.positions) ?? []
      const valid = rows.filter((p) => p && typeof p.id === 'string' && typeof p.symbol === 'string' && typeof p.buyPrice === 'number')
      dispatch({ type: 'IMPORT_POSITIONS', positions: valid })
      setImportMsg(`Imported ${valid.length} position${valid.length === 1 ? '' : 's'}.`)
    } catch {
      setImportMsg('That file is not a Kevision positions export.')
    }
  }

  return (
    <main className="page">
      <PageHead title="Positions" sub="Stocks you bought from a recommendation, tracked against their plan. Saved in this browser only.">
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn(false)} onClick={exportJson} disabled={!positions.length}>
              Export
            </button>
            <button style={btn(false)} onClick={() => fileRef.current?.click()}>
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importJson(f)
                e.target.value = ''
              }}
            />
          </div>
      </PageHead>
      {importMsg && <div className="enter t-sub">{importMsg}</div>}
      <Card padding={6}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}>
          <Tile label="OPEN" value={String(open.length)} />
          <Tile label="NEEDS ACTION" value={String(needsAction)} color={needsAction ? 'var(--warn)' : undefined} />
          <Tile label="OPEN P&L (AVG)" value={avgOpen == null ? '—' : formatPct(avgOpen)} sub={hasUsd ? money(openUsd) : undefined} color={pnlColor(avgOpen)} />
          <Tile label="CLOSED P&L" value={closed.length === 0 ? '—' : hasUsd ? money(closedUsd) : `${closed.length} trades`} color={hasUsd ? pnlColor(closedUsd) : undefined} />
          <Tile label="WIN RATE" value={closed.length ? `${Math.round((wins / closed.length) * 100)}%` : '—'} sub={closed.length ? `${wins} of ${closed.length}` : undefined} />
        </div>
      </Card>

      {open.length > 0 && <RiskPanel risk={risk} accountSize={accountSize} />}

      {open.length === 0 && (
        <Card padding={24}>
          <div className="t-headline" style={{ marginBottom: 6 }}>No open positions</div>
          <div className="t-sub">
            Open a stock on the Stocks page and press <b>I bought this</b> under its position plan. It shows up here with live P&amp;L and tells you when the plan says to sell.
          </div>
        </Card>
      )}

      {open.length > 0 && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 16, alignItems: 'start' }}>
          {open
            .slice()
            .sort((a, b) => urgency(a) - urgency(b))
            .map((v) => (
              <PositionCard key={v.position.id} v={v} />
            ))}
        </section>
      )}

      {closed.length > 0 && (
        <Card padding={0}>
          <div className="t-headline" style={{ padding: '18px 20px 6px' }}>Closed</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'left' }}>
                  {['STOCK', 'BOUGHT', 'SOLD', 'DAYS', 'RETURN', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 20px', fontWeight: 500 }}>{prettyLabel(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closed.map((v) => (
                  <tr key={v.position.id} style={{ borderTop: '1px solid var(--hairline)' }}>
                    <td style={td}>
                      <b style={{ fontWeight: 600 }}>{v.position.symbol}</b> <span style={{ color: 'var(--muted)' }}>{prettyName(v.position.name)}</span>
                    </td>
                    <td style={{ ...td, ...mono }}>
                      {formatPrice(v.position.buyPrice)} <span style={{ color: 'var(--faint)' }}>{v.position.boughtAt}</span>
                    </td>
                    <td style={{ ...td, ...mono }}>
                      {formatPrice(v.position.closed!.price)} <span style={{ color: 'var(--faint)' }}>{v.position.closed!.at}</span>
                    </td>
                    <td style={{ ...td, ...mono }}>{v.daysHeld}</td>
                    <td style={{ ...td, ...mono, color: pnlColor(v.pnlPct), fontWeight: 600 }}>
                      {v.pnlPct == null ? '—' : formatPct(v.pnlPct)}
                      {v.pnlUsd != null && <span style={{ fontWeight: 400 }}> {money(v.pnlUsd)}</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button style={linkBtn} onClick={() => dispatch({ type: 'UPDATE_POSITION', id: v.position.id, patch: { closed: undefined } })}>
                        Reopen
                      </button>
                      <button style={{ ...linkBtn, color: 'var(--down)' }} onClick={() => dispatch({ type: 'REMOVE_POSITION', id: v.position.id })}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <div className="t-caption">
        Tracking only: nothing is bought or sold for you. Use Export to back up or move your positions to another browser.
      </div>
    </main>
  )
}

const td = { padding: '12px 20px', whiteSpace: 'nowrap', fontSize: 14 } as const
const linkBtn = { background: 'none', border: 'none', color: 'var(--info)', cursor: 'pointer', fontSize: 14, fontWeight: 500, padding: '0 6px' } as const

function pnlColor(v: number | null) {
  if (v == null) return undefined
  return v >= 0 ? 'var(--up)' : 'var(--down)'
}

/** Positions that need action first. */
function urgency(v: PositionView) {
  return { stop: 0, target2: 1, target1: 2, weak: 3, 'below-entry': 4, 'on-track': 5, 'no-price': 6, closed: 7 }[v.status.key]
}

function RiskPanel({ risk, accountSize }: { risk: ReturnType<typeof portfolioRisk>; accountSize: number | null }) {
  const dispatch = useAppDispatch()
  const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`
  return (
    <Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="t-headline">Portfolio risk</span>
        {!accountSize && (
          <a href="#" style={{ fontSize: 14 }} onClick={(e) => (e.preventDefault(), dispatch({ type: 'SET_VIEW', view: 'settings' }))}>
            Set your account size in Settings for risk in %
          </a>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', margin: '0 -14px' }}>
        <Tile
          label="OPEN RISK"
          value={risk.openRiskPct != null ? `${(risk.openRiskPct * 100).toFixed(1)}%` : usd(risk.openRiskUsd)}
          sub={`if every stop is hit · limit ${MAX_OPEN_RISK * 100}%`}
          color={risk.openRiskPct != null && risk.openRiskPct > MAX_OPEN_RISK ? 'var(--down)' : undefined}
        />
        <Tile label="INVESTED" value={usd(risk.invested)} sub={accountSize ? `${((risk.invested / accountSize) * 100).toFixed(0)}% of account` : undefined} />
        <Tile label="INDUSTRIES" value={String(risk.bySector.filter((s) => s.sector !== 'Unknown').length)} sub={risk.unsized ? `${risk.unsized} without shares not counted` : undefined} />
      </div>
      {risk.bySector.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {risk.bySector.map((s) => (
            <div key={s.sector} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 180px) 1fr auto', gap: 12, alignItems: 'center', fontSize: 14 }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sector}</span>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--seg-track)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (s.share ?? 0) * 100)}%`, height: '100%', background: (s.share ?? 0) > 0.3 ? 'var(--warn)' : 'var(--info)' }} />
              </div>
              <span style={{ color: 'var(--muted)', ...mono }}>
                {s.positions} pos{s.share != null ? ` · ${(s.share * 100).toFixed(0)}%` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      {risk.warnings.map((w) => (
        <div key={w} style={{ fontSize: 14, background: 'var(--warnsoft)', borderRadius: 12, padding: '10px 14px', lineHeight: 1.45 }}>
          {w}
        </div>
      ))}
    </Card>
  )
}

function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{prettyLabel(label)}</div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', marginTop: 2, color, ...mono }}>{value}</div>
      {sub && <div className="t-caption" style={{ fontSize: 12.5, ...mono }}>{sub}</div>}
    </div>
  )
}

function PositionCard({ v }: { v: PositionView }) {
  const dispatch = useAppDispatch()
  const p = v.position
  const [mode, setMode] = useState<null | 'half' | 'close' | 'delete'>(null)
  const [px, setPx] = useState('')
  const [date, setDate] = useState(todayIso())

  function startMode(m: 'half' | 'close' | 'delete') {
    setMode(m)
    setPx(v.price != null ? v.price.toFixed(2) : '')
    setDate(todayIso())
  }
  function confirm() {
    const n = Number(px.replace(',', '.'))
    if (mode === 'delete') dispatch({ type: 'REMOVE_POSITION', id: p.id })
    else if (n > 0 && mode === 'half') dispatch({ type: 'UPDATE_POSITION', id: p.id, patch: { halfSold: { price: n, at: date } } })
    else if (n > 0 && mode === 'close') dispatch({ type: 'UPDATE_POSITION', id: p.id, patch: { closed: { price: n, at: date } } })
    setMode(null)
  }

  const nowRating = v.rec ? RATING_META[v.rec.rating] : null

  return (
    <Card
      padding={18}
      style={{ display: 'flex', flexDirection: 'column', gap: 14, ...(['stop', 'target1', 'target2'].includes(v.status.key) ? { boxShadow: `inset 0 0 0 1.5px ${v.status.color}, var(--shadow)` } : {}) }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-.01em' }}>{p.symbol}</span>
            {p.halfSold && <Chip>Half sold</Chip>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prettyName(p.name)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', color: pnlColor(v.pnlPct), ...mono }}>{v.pnlPct == null ? '—' : formatPct(v.pnlPct)}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', ...mono }}>{v.pnlUsd != null ? money(v.pnlUsd) : `${v.daysHeld} days`}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--inset)', borderRadius: 12, padding: '12px 14px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.status.color, marginTop: 6, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: v.status.color }}>{v.status.label}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.45 }}>{v.status.advice}</div>
        </div>
      </div>
      {v.notes.map((n) => (
        <div key={n} style={{ fontSize: 13.5, background: 'var(--warnsoft)', borderRadius: 12, padding: '10px 14px', lineHeight: 1.45 }}>
          {n}
        </div>
      ))}

      {p.plan && v.price != null && <Track p={p} price={v.price} stop={v.stop ?? p.plan.stop} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        <Stat label="Bought" value={formatPrice(p.buyPrice)} sub={p.boughtAt} />
        <Stat label="Now" value={v.price != null ? formatPrice(v.price) : '—'} sub={`${v.tradingDays} trading days`} />
        <Stat
          label="Stop"
          value={v.stop != null ? formatPrice(v.stop) : '—'}
          sub={v.stopKind === 'trailing' ? 'trailing' : v.stopKind === 'break-even' ? 'break-even' : 'sell all'}
        />
        <Stat label="Score" value={v.rec ? String(v.rec.score) : '—'} sub={p.scoreAtBuy != null ? `was ${p.scoreAtBuy}` : undefined} color={nowRating?.color} />
      </div>

      {mode ? (
        <div className="enter" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {mode === 'delete' ? (
            <span style={{ fontSize: 13 }}>Delete this position? This cannot be undone.</span>
          ) : (
            <>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>{mode === 'half' ? 'Sold half at' : 'Sold all at'}</span>
              <input inputMode="decimal" value={px} onChange={(e) => setPx(e.target.value)} style={{ ...inputStyle, ...mono, width: 110, height: 34 }} />
              <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: 150, height: 34 }} />
            </>
          )}
          <button style={{ ...btn(true), height: 36, background: mode === 'delete' ? 'var(--down)' : 'var(--info)' }} onClick={confirm}>
            {mode === 'delete' ? 'Delete' : 'Save'}
          </button>
          <button style={{ ...btn(false), height: 36 }} onClick={() => setMode(null)}>
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={{ ...btn(false), height: 34 }}
            onClick={() => {
              dispatch({ type: 'OPEN_STOCK', symbol: p.symbol })
            }}
            disabled={!v.rec}
            title={v.rec ? 'Open chart and plan' : 'No longer in the recommendations'}
          >
            Chart
          </button>
          {!p.halfSold && (
            <button style={{ ...btn(false), height: 34 }} onClick={() => startMode('half')}>
              Sold half
            </button>
          )}
          <button style={{ ...btn(false), height: 34 }} onClick={() => startMode('close')}>
            Close position
          </button>
          <button style={{ ...btn(false), height: 34, color: 'var(--down)', marginLeft: 'auto' }} onClick={() => startMode('delete')}>
            Delete
          </button>
        </div>
      )}
    </Card>
  )
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 1, color, ...mono }}>{value}</div>
      {sub && <div className="t-caption" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...mono }}>{sub}</div>}
    </div>
  )
}

/** Progress from stop through buy price to target 2, with the current price. */
function Track({ p, price, stop }: { p: Position; price: number; stop: number }) {
  const plan = p.plan!
  const span = plan.target2 - Math.min(stop, plan.stop)
  const lo = Math.min(stop, plan.stop, price) - span * 0.05
  const hi = Math.max(plan.target2, price) + span * 0.05
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
  const mark = (v: number, color: string, label: string) => (
    <div style={{ position: 'absolute', left: x(v), top: 0, bottom: 0 }}>
      <div style={{ position: 'absolute', top: -3, bottom: -3, width: 2, marginLeft: -1, background: color }} />
      <div style={{ position: 'absolute', top: 14, transform: 'translateX(-50%)', fontSize: 11.5, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  )
  const up = price >= p.buyPrice
  return (
    <div style={{ padding: '20px 8px 22px' }} aria-hidden>
      <div style={{ position: 'relative', height: 6, borderRadius: 999, background: 'var(--seg-track)' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: up ? x(p.buyPrice) : x(price),
            width: `calc(${up ? x(price) : x(p.buyPrice)} - ${up ? x(p.buyPrice) : x(price)})`,
            background: up ? 'var(--up)' : 'var(--down)',
            opacity: 0.55,
          }}
        />
        {Math.abs(stop - p.buyPrice) < 0.01 ? (
          mark(p.buyPrice, 'var(--info)', 'Buy = stop')
        ) : (
          <>
            {mark(stop, 'var(--down)', 'Stop')}
            {mark(p.buyPrice, 'var(--info)', 'Buy')}
          </>
        )}
        {mark(plan.target1, 'var(--up)', 'T1')}
        {mark(plan.target2, 'var(--up)', 'T2')}
        <div style={{ position: 'absolute', top: -18, left: x(price), transform: 'translateX(-50%)', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>Now</div>
        <div style={{ position: 'absolute', top: '50%', left: x(price), width: 12, height: 12, marginLeft: -6, marginTop: -6, borderRadius: '50%', background: 'var(--text)', border: '2px solid var(--surface)' }} />
      </div>
    </div>
  )
}
