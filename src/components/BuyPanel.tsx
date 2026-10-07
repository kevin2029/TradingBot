import { useState } from 'react'
import { FieldLabel, inputStyle, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { Recommendation } from '../types'
import { formatPct, formatPrice } from '../utils/format'
import { MAX_OPEN_RISK, MAX_SECTOR_POSITIONS, evaluatePosition, newPositionId, portfolioRisk, todayIso } from '../utils/positions'

/** "I bought this" button + small form; shows the open position if you already hold it. */
export function BuyPanel({ rec, price }: { rec: Recommendation; price: number }) {
  const { positions, quotes, signals, accountSize } = useAppState()
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)
  const [buyPrice, setBuyPrice] = useState('')
  const [shares, setShares] = useState('')
  const [date, setDate] = useState(todayIso())

  const holding = positions.filter((p) => p.symbol === rec.symbol && !p.closed)

  // Portfolio checks for the buy being entered: concentration, total risk and size.
  const checks: string[] = []
  if (open) {
    const views = positions.map((p) =>
      evaluatePosition(p, quotes[p.symbol]?.price, signals?.recommendations.find((r) => r.symbol === p.symbol)),
    )
    const risk = portfolioRisk(views, accountSize)
    const bp = Number(buyPrice.replace(',', '.'))
    const sh = Number(shares.replace(',', '.'))
    if (rec.sector) {
      const same = risk.bySector.find((x) => x.sector === rec.sector)
      if (same && same.positions >= MAX_SECTOR_POSITIONS)
        checks.push(`You already hold ${same.positions} ${rec.sector} positions. A third makes it one big bet.`)
    }
    if (accountSize && bp > 0 && sh > 0 && rec.plan) {
      const addRisk = Math.max(0, bp - rec.plan.stop) * sh
      const total = (risk.openRiskUsd + addRisk) / accountSize
      if (total > MAX_OPEN_RISK) checks.push(`With this buy all stops together risk ${(total * 100).toFixed(1)}% of your account (limit ${MAX_OPEN_RISK * 100}%).`)
      const share = (bp * sh) / accountSize
      if (share > rec.plan.positionPct + 0.005)
        checks.push(`This is ${(share * 100).toFixed(0)}% of your account; the plan suggests about ${Math.round(rec.plan.positionPct * 100)}% (${Math.floor((rec.plan.positionPct * accountSize) / bp)} shares).`)
    } else if (accountSize && bp > 0 && rec.plan && !(sh > 0)) {
      checks.push(`Plan size: about ${Math.floor((rec.plan.positionPct * accountSize) / bp)} shares (${Math.round(rec.plan.positionPct * 100)}% of your account).`)
    }
  }

  function start() {
    setBuyPrice(price.toFixed(2))
    setShares('')
    setDate(todayIso())
    setOpen(true)
  }

  function save() {
    const bp = Number(buyPrice.replace(',', '.'))
    if (!(bp > 0)) return
    const sh = Number(shares.replace(',', '.'))
    const plan = rec.plan
    dispatch({
      type: 'ADD_POSITION',
      position: {
        id: newPositionId(),
        symbol: rec.symbol,
        name: rec.name,
        boughtAt: date || todayIso(),
        buyPrice: bp,
        shares: sh > 0 ? sh : undefined,
        plan: plan
          ? {
              stop: plan.stop,
              target1: plan.target1,
              target2: plan.target2,
              entryLow: plan.entryLow,
              entryHigh: plan.entryHigh,
              action: plan.action,
              trailDistance: plan.trailDistance,
            }
          : null,
        sector: rec.sector ?? null,
        scoreAtBuy: rec.score,
        ratingAtBuy: rec.rating,
      },
    })
    setOpen(false)
  }

  return (
    <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {holding.map((p) => {
        const v = evaluatePosition(p, price, rec)
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--info)', background: 'var(--infosoft)', borderRadius: 6, padding: '2px 8px' }}>Holding</span>
            <span>
              Bought {formatPrice(p.buyPrice)} on {p.boughtAt}
              {v.pnlPct != null && (
                <span style={{ color: v.pnlPct >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 600, ...mono }}> {formatPct(v.pnlPct)}</span>
              )}
            </span>
            <span style={{ color: v.status.color, fontWeight: 600 }}>{v.status.label}</span>
            <a href="#" style={{ marginLeft: 'auto' }} onClick={(e) => (e.preventDefault(), dispatch({ type: 'SET_VIEW', view: 'positions' }))}>
              Open in Positions
            </a>
          </div>
        )
      })}

      {!open ? (
        <div>
          <button onClick={start} style={btn(true)}>
            {holding.length ? 'Log another buy' : 'I bought this'}
          </button>
          <span className="t-caption" style={{ fontSize: 13, marginLeft: 12 }}>Follow it in Positions against this plan.</span>
        </div>
      ) : (
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {checks.map((c) => (
          <div key={c} style={{ fontSize: 14, background: 'var(--warnsoft)', borderRadius: 12, padding: '10px 14px', lineHeight: 1.45 }}>
            {c}
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, alignItems: 'end' }}>
          <div>
            <FieldLabel>Buy price ($)</FieldLabel>
            <input inputMode="decimal" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} style={{ ...inputStyle, ...mono }} />
          </div>
          <div>
            <FieldLabel>Shares (optional)</FieldLabel>
            <input inputMode="decimal" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="e.g. 10" style={{ ...inputStyle, ...mono }} />
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={!(Number(buyPrice.replace(',', '.')) > 0)} style={btn(true)}>
              Save
            </button>
            <button onClick={() => setOpen(false)} style={btn(false)}>
              Cancel
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}

/** Capsule buttons: filled accent for the main action, quiet gray for the rest. */
export function btn(primary: boolean) {
  return {
    height: 38,
    padding: '0 18px',
    borderRadius: 999,
    border: 'none',
    background: primary ? 'var(--info)' : 'var(--seg-track)',
    color: primary ? '#fff' : 'var(--text)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as const
}
