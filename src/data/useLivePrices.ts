import { useEffect, useMemo, useRef } from 'react'
import { useAppDispatch, useAppState, type Tick } from '../state/store'
import type { LiveQuote } from '../types'

/**
 * Real-time prices from Finnhub's free tier, straight from the browser:
 *  - REST /quote once per symbol for the current price and previous close
 *  - WebSocket trade stream for live ticks (free tier: up to 50 symbols)
 *  - /stock/market-status to know if the US market is open
 * The key is the viewer's own free key, kept in localStorage, never in the build.
 */
const REST = 'https://finnhub.io/api/v1'
const WS = 'wss://ws.finnhub.io'
const MAX_WS_SYMBOLS = 50
const FLUSH_MS = 1000
/** Keep at most one chart tick per symbol per this many ms. */
const TICK_SPACING_MS = 2000

export function useLivePrices(symbols: string[]) {
  const { finnhubKey } = useAppState()
  const dispatch = useAppDispatch()
  const list = useMemo(() => [...new Set(symbols)].slice(0, MAX_WS_SYMBOLS), [symbols.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const lastTickAt = useRef<Record<string, number>>({})

  // ---- REST: snapshot quotes + market status --------------------------------
  useEffect(() => {
    if (!finnhubKey || list.length === 0) return
    let cancelled = false
    const ctrl = new AbortController()

    async function run() {
      try {
        const ms = await fetch(`${REST}/stock/market-status?exchange=US&token=${finnhubKey}`, { signal: ctrl.signal })
        if (ms.status === 401) throw new Error('Finnhub rejected the API key')
        if (ms.ok) {
          const j = await ms.json()
          if (!cancelled && typeof j.isOpen === 'boolean') dispatch({ type: 'MARKET_OPEN', open: j.isOpen })
        }
        // Free tier is 60 calls/min: space the snapshot calls out.
        for (const symbol of list) {
          if (cancelled) return
          const res = await fetch(`${REST}/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`, { signal: ctrl.signal })
          if (res.status === 429) break
          if (!res.ok) continue
          const q = await res.json()
          if (q && typeof q.c === 'number' && q.c > 0 && !cancelled) {
            dispatch({ type: 'QUOTES', quotes: { [symbol]: { price: q.c, prevClose: q.pc, ts: (q.t || Date.now() / 1000) * 1000 } } })
          }
          await new Promise((r) => setTimeout(r, 250))
        }
      } catch (err) {
        if (!cancelled && (err as Error).name !== 'AbortError')
          dispatch({ type: 'LIVE_STATUS', status: 'error', message: (err as Error).message })
      }
    }
    run()
    const id = setInterval(run, 5 * 60 * 1000)
    return () => {
      cancelled = true
      ctrl.abort()
      clearInterval(id)
    }
  }, [finnhubKey, list, dispatch])

  // ---- WebSocket: live trades ----------------------------------------------
  useEffect(() => {
    if (!finnhubKey) {
      dispatch({ type: 'LIVE_STATUS', status: 'no-key' })
      return
    }
    if (list.length === 0) return

    let ws: WebSocket | null = null
    let closed = false
    let retry = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let quietTimer: ReturnType<typeof setTimeout> | undefined
    const pendingQuotes: Record<string, LiveQuote> = {}
    const pendingTicks: Record<string, Tick[]> = {}

    const flush = setInterval(() => {
      const qs = Object.keys(pendingQuotes)
      if (qs.length === 0) return
      const quotes = { ...pendingQuotes }
      const ticks = { ...pendingTicks }
      for (const k of qs) delete pendingQuotes[k]
      for (const k of Object.keys(pendingTicks)) delete pendingTicks[k]
      dispatch({ type: 'QUOTES', quotes, ticks })
    }, FLUSH_MS)

    function connect() {
      dispatch({ type: 'LIVE_STATUS', status: 'connecting' })
      ws = new WebSocket(`${WS}?token=${finnhubKey}`)
      ws.onopen = () => {
        retry = 0
        for (const symbol of list) ws?.send(JSON.stringify({ type: 'subscribe', symbol }))
        // No trades for a while usually means the market is closed.
        quietTimer = setTimeout(() => dispatch({ type: 'LIVE_STATUS', status: 'closed' }), 30000)
      }
      ws.onmessage = (ev) => {
        let msg: { type?: string; data?: { s: string; p: number; t: number }[]; msg?: string }
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        if (msg.type === 'error') {
          dispatch({ type: 'LIVE_STATUS', status: 'error', message: msg.msg })
          return
        }
        if (msg.type !== 'trade' || !msg.data) return
        clearTimeout(quietTimer)
        quietTimer = setTimeout(() => dispatch({ type: 'LIVE_STATUS', status: 'closed' }), 120000)
        dispatch({ type: 'LIVE_STATUS', status: 'live' })
        for (const tr of msg.data) {
          pendingQuotes[tr.s] = { price: tr.p, ts: tr.t }
          const last = lastTickAt.current[tr.s] ?? 0
          if (tr.t - last >= TICK_SPACING_MS) {
            lastTickAt.current[tr.s] = tr.t
            ;(pendingTicks[tr.s] ??= []).push({ t: tr.t, p: tr.p })
          }
        }
      }
      ws.onerror = () => dispatch({ type: 'LIVE_STATUS', status: 'error', message: 'WebSocket error' })
      ws.onclose = () => {
        clearTimeout(quietTimer)
        if (closed) return
        retry = Math.min(retry + 1, 6)
        retryTimer = setTimeout(connect, 1000 * 2 ** retry)
      }
    }
    connect()

    return () => {
      closed = true
      clearInterval(flush)
      clearTimeout(retryTimer)
      clearTimeout(quietTimer)
      if (ws && ws.readyState === WebSocket.OPEN) {
        for (const symbol of list) ws.send(JSON.stringify({ type: 'unsubscribe', symbol }))
      }
      ws?.close()
    }
  }, [finnhubKey, list, dispatch])
}
