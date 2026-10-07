#!/usr/bin/env node
// Builds public/data/signals.json: ranked stock recommendations from free sources.
//
//   node scripts/build-signals.mjs
//
// Env (all optional, but more keys = more signals):
//   FINNHUB_API_KEY   insider transactions (free key at finnhub.io)
//   BARGO_API_KEY     raises the Congress trades quota (free key at bargo.ai)
//   LDA_API_KEY       raises the lobbying API quota (free key at lda.gov/api/register)
//   SEC_USER_AGENT    contact string for SEC requests, e.g. "Name email@example.com"
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { loadTickers } from './signals/sources/tickers.mjs'
import * as congressSrc from './signals/sources/congress.mjs'
import * as socialSrc from './signals/sources/social.mjs'
import * as contractsSrc from './signals/sources/contracts.mjs'
import * as lobbyingSrc from './signals/sources/lobbying.mjs'
import * as insiderSrc from './signals/sources/insider.mjs'
import * as pricesSrc from './signals/sources/prices.mjs'
import * as intradaySrc from './signals/sources/intraday.mjs'
import * as earningsSrc from './signals/sources/earnings.mjs'
import * as iposSrc from './signals/sources/ipos.mjs'
import { loadSectors } from './signals/sources/sectors.mjs'
import { runBacktest } from './signals/backtest.mjs'
import { evaluateTrack, loadTrackLog, recordPicks, saveTrackLog, symbolsToPrice } from './signals/track.mjs'
import { marketRegime, scoreStock, technicals, WEIGHTS } from './signals/score.mjs'
import { tradePlan } from './signals/plan.mjs'
import { readCache, writeCache } from './signals/cache.mjs'
import { UNIVERSE } from './signals/universe.mjs'

const OUT = process.env.SIGNALS_OUT || 'public/data/signals.json'
// Fixed universe (large US stocks) plus stocks surfaced by Congress, contracts and lobbying.
// Every stock is then scored the same way and ranked, instead of only looking at what is hyped.
const MAX_DISCOVERED = 30
const MAX_CANDIDATES = 135

/** Rank of v in a sorted list as 0..1. */
function percentile(sorted, v) {
  if (v == null || sorted.length === 0) return null
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < v) lo = mid + 1
    else hi = mid
  }
  return sorted.length > 1 ? lo / (sorted.length - 1) : 0.5
}
const BENCHMARKS = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'Nasdaq 100' },
  { symbol: 'IWM', name: 'Russell 2000' },
  { symbol: 'DIA', name: 'Dow Jones' },
]
const HISTORY_BARS = 260
const HOT_COUNT = 25 // most-mentioned WSB stocks shown in the Hot & volatile tab
const IPO_MIN_BARS = 63 // about 3 months of prices before a new listing is scored

const log = (...a) => console.log('[signals]', ...a)

async function safe(name, fn, empty) {
  try {
    const r = await fn()
    log(`${name}: ${r.ok ? 'ok' : 'degraded'} (${r.count} rows${r.stale ? ', stale cache' : ''})${r.error ? ` ${r.error}` : ''}`)
    return r
  } catch (err) {
    log(`${name}: FAILED ${err.message}`)
    return { ok: false, error: err.message, count: 0, fetchedAt: Date.now(), byTicker: new Map(), ...empty }
  }
}

function sourceStatus(r, attribution) {
  return {
    ok: !!r.ok,
    count: r.count || 0,
    fetchedAt: new Date(r.fetchedAt || Date.now()).toISOString(),
    ...(r.error ? { error: String(r.error).slice(0, 200) } : {}),
    ...(r.note ? { note: String(r.note).slice(0, 200) } : {}),
    attribution,
  }
}

function packHistory(bars) {
  return bars.slice(-HISTORY_BARS).map((b) => [Math.round(b[0] / 1000), b[1]])
}

/** Load KEY=VALUE pairs from .env.local / .env without overriding real env vars. */
async function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    const text = await readFile(file, 'utf8').catch(() => '')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

async function main() {
  const started = Date.now()
  await loadEnvFiles()
  // one Finnhub key in .env.local serves both the browser and the pipeline
  if (!process.env.FINNHUB_API_KEY && process.env.VITE_FINNHUB_KEY) process.env.FINNHUB_API_KEY = process.env.VITE_FINNHUB_KEY

  if (process.argv.includes('--if-missing')) {
    const info = await stat(OUT).catch(() => null)
    const existing = info && (await readFile(OUT, 'utf8').then(JSON.parse).catch(() => null))
    // rebuild when the file predates the trade-plan fields
    const current = existing?.recommendations?.[0]?.plan !== undefined && existing?.intraday?.SPY?.week !== undefined && existing?.backtest?.variants !== undefined && existing?.insiders !== undefined
    if (info && current && existing.recommendations.length > 0 && Date.now() - info.mtimeMs < 6 * 3600000) {
      log(`${OUT} is recent, skipping (run "npm run signals" to refresh)`)
      return
    }
    log('no recent signals.json, building it now (a few minutes the first time)...')
  }

  let tickers
  try {
    tickers = await loadTickers()
  } catch (err) {
    log(`SEC ticker list failed (${err.message}), name matching disabled`)
    tickers = { has: (t) => /^[A-Z]{1,5}$/.test(t), name: () => null, match: () => null }
  }

  const [congress, social, contracts, lobbying, earnings, ipos, track] = await Promise.all([
    safe('congress', () => congressSrc.loadCongress()),
    safe('social', () => socialSrc.loadSocial()),
    safe('contracts', () => contractsSrc.loadContracts(tickers)),
    safe('lobbying', () => lobbyingSrc.loadLobbying(tickers)),
    safe('earnings', () => earningsSrc.loadEarnings(), { bySymbol: new Map() }),
    safe('ipos', () => iposSrc.loadIpos(), { items: [] }),
    loadTrackLog(),
  ])
  log(`track record: ${track.log.length} days (from ${track.from})`)

  // ---- candidate universe -------------------------------------------------
  // WallStreetBets no longer adds stocks: hype predicts lower returns, so it only counts as a risk.
  const discovered = []
  const add = (list) => list.forEach((t) => discovered.push(t))
  add(
    [...congress.byTicker.entries()]
      .filter(([, a]) => a.net > 0)
      .sort((a, b) => b[1].net - a[1].net)
      .slice(0, 15)
      .map(([t]) => t),
  )
  add([...contracts.byTicker.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 10).map(([t]) => t))
  add([...lobbying.byTicker.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 8).map(([t]) => t))

  const benchSymbols = new Set(BENCHMARKS.map((b) => b.symbol))
  const valid = (t) => /^[A-Z]{1,5}(\.[A-Z])?$/.test(t) && tickers.has(t) && !benchSymbols.has(t)
  const universe = UNIVERSE.filter(valid)
  const extra = [...new Set(discovered)].filter((t) => valid(t) && !universe.includes(t)).slice(0, MAX_DISCOVERED)
  const candidates = [...universe, ...extra].slice(0, MAX_CANDIDATES)
  log(`candidates: ${candidates.length} (${universe.length} universe, ${extra.length} discovered)`)

  // past picks still being tracked also need prices
  const trackSymbols = symbolsToPrice(track.log).filter((s) => !candidates.includes(s) && !benchSymbols.has(s)).slice(0, 25)
  // Hot & volatile tab (not scored unless already a candidate) and recent IPOs
  const hotSymbols = [...social.byTicker.values()]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => r.ticker)
    .filter((t) => valid(t))
    .slice(0, HOT_COUNT)
  const today = new Date().toISOString().slice(0, 10)
  const ipoSymbols = ipos.items.filter((i) => i.symbol && i.date <= today && !benchSymbols.has(i.symbol)).map((i) => i.symbol)
  const extraPriced = [...new Set([...trackSymbols, ...hotSymbols, ...ipoSymbols])].filter((s) => !candidates.includes(s))
  const [[insider, sectors], prices, lobbyTrend] = await Promise.all([
    // insider and sectors share Finnhub's 60 calls/min, so they run one after the other
    (async () => {
      const ins = await safe('insider', () => insiderSrc.loadInsider(candidates))
      const sec = await safe('sectors', () => loadSectors(candidates), { bySymbol: new Map() })
      return [ins, sec]
    })(),
    safe('prices', () => pricesSrc.loadPrices([...benchSymbols, ...candidates, ...extraPriced]), { bySymbol: new Map() }),
    // change in lobbying spend per company (a rising budget says more than a big one)
    safe('lobbying trend', () => lobbyingSrc.loadLobbyingTrend(new Map(candidates.map((s) => [s, tickers.name(s) || s])))),
  ])
  const spyBars = prices.bySymbol.get('SPY')?.bars
  const spyTech = spyBars ? technicals(spyBars) : null

  // ---- market -------------------------------------------------------------
  const indices = BENCHMARKS.map((b) => {
    const p = prices.bySymbol.get(b.symbol)
    if (!p) return null
    const t = technicals(p.bars)
    return { ...b, ...t, history: packHistory(p.bars) }
  }).filter(Boolean)
  const market = { ...marketRegime(indices), indices }

  // ---- score ----------------------------------------------------------------
  // New listings join the ranking once they have about 3 months of prices.
  const ipoScored = ipoSymbols.filter((s) => !candidates.includes(s) && (prices.bySymbol.get(s)?.bars.length ?? 0) >= IPO_MIN_BARS)
  const scored = [...candidates, ...ipoScored]
  // Momentum and 52 week high are ranked against all candidates (percentiles).
  const techs = new Map()
  for (const symbol of scored) {
    const p = prices.bySymbol.get(symbol)
    if (!p) continue
    const tech = technicals(p.bars)
    if (spyTech) tech.rs63 = tech.ret63 - spyTech.ret63
    techs.set(symbol, tech)
  }
  const sortedOf = (k) => [...techs.values()].map((t) => t[k]).filter((v) => v != null).sort((a, b) => a - b)
  const moms = sortedOf('mom12_1')
  const proxs = sortedOf('high52prox')
  for (const t of techs.values()) {
    t.momPct = moms.length >= 10 ? percentile(moms, t.mom12_1) : null
    t.highPct = proxs.length >= 10 ? percentile(proxs, t.high52prox) : null
  }

  const recommendations = scored
    .map((symbol) => {
      const p = prices.bySymbol.get(symbol)
      const tech = techs.get(symbol) ?? null
      const profile = sectors.bySymbol.get(symbol)
      const rec = scoreStock({
        symbol,
        name: p?.name || tickers.name(symbol) || symbol,
        tech,
        congress: congress.byTicker.get(symbol),
        insider: insider.byTicker.get(symbol),
        social: social.byTicker.get(symbol),
        contracts: contracts.byTicker.get(symbol),
        lobbying: lobbyTrend.byTicker.get(symbol),
        regime: market.regime,
        marketCap: profile?.marketCap ?? null,
      })
      return {
        ...rec,
        sector: profile?.industry ?? null,
        universe: universe.includes(symbol),
        ...(ipoScored.includes(symbol) ? { newListing: true } : {}),
        price: tech ? { ...tech, history: packHistory(p.bars) } : null,
        plan: tech ? tradePlan(p.bars, tech, rec.rating, { regime: market.regime, earnings: earnings.bySymbol.get(symbol) }) : null,
      }
    })
    .filter((r) => r.price) // can't recommend what we can't chart
    .sort((a, b) => b.score - a.score || b.agreeing - a.agreeing)

  // ---- backtest of the plan rules (chart signal only) ------------------------------
  const backtest = runBacktest(prices.bySymbol, recommendations.map((r) => r.symbol), spyBars)
  for (const r of recommendations) r.backtest = backtest.bySymbol[r.symbol] ?? null
  delete backtest.bySymbol
  log(`backtest: ${backtest.overall.trades} trades, win rate ${backtest.overall.winRate ?? '-'}, avg ${backtest.overall.avgR ?? '-'}R`)
  for (const [k, v] of Object.entries(backtest.variants ?? {})) log(`  ${k}: ${v.trades} trades, avg ${v.avgR ?? '-'}R, vs S&P ${v.avgExcess ?? '-'}`)

  // ---- track record of real recommendations -------------------------------------
  let trackLog = track.log
  if (recommendations.length && spyBars?.length) {
    trackLog = recordPicks(trackLog, new Date(spyBars[spyBars.length - 1][0]).toISOString().slice(0, 10), recommendations, spyBars[spyBars.length - 1][1])
    await saveTrackLog(trackLog)
  }
  const trackRecord = evaluateTrack(trackLog, prices.bySymbol)

  // ---- Hot & volatile and new listings ---------------------------------------------
  const recBySymbol = new Map(recommendations.map((r) => [r.symbol, r]))
  const quick = (symbol) => {
    const p = prices.bySymbol.get(symbol)
    if (!p?.bars.length) return null
    const t = techs.get(symbol) ?? technicals(p.bars)
    return {
      name: p.name || null,
      price: {
        last: t.last,
        change1d: t.change1d,
        ret20: t.ret20,
        atr14: t.atr14,
        atrPct: t.atr14 && t.last ? t.atr14 / t.last : null,
        vol20: t.vol20,
        volume: t.volume,
        volume20: t.volume20,
        history: packHistory(p.bars),
      },
      bars: p.bars.length,
      firstClose: p.bars[0][1],
    }
  }
  const ranking = (symbol) => {
    const r = recBySymbol.get(symbol)
    return r ? { score: r.score, rating: r.rating, action: r.plan?.action ?? null } : null
  }
  const hot = {
    items: hotSymbols
      .map((symbol) => {
        const s = social.byTicker.get(symbol)
        const q = quick(symbol)
        if (!q) return null
        return {
          symbol,
          name: q.name || tickers.name(symbol) || symbol,
          rank: s.rank,
          rank24h: s.rank24h,
          mentions: s.mentions,
          mentions24h: s.mentions24h,
          upvotes: s.upvotes,
          price: q.price,
          ranking: ranking(symbol),
        }
      })
      .filter(Boolean),
  }
  const ipoList = {
    lockupDays: iposSrc.LOCKUP_DAYS,
    minBars: IPO_MIN_BARS,
    items: ipos.items.map((i) => {
      const q = i.symbol ? quick(i.symbol) : null
      return {
        ...i,
        name: q?.name || i.name,
        listedDays: q?.bars ?? 0,
        firstClose: q?.firstClose ?? null,
        price: q?.price ?? null,
        ranking: i.symbol ? ranking(i.symbol) : null,
      }
    }),
  }
  // ---- insider activity feed and Congress totals ------------------------------------
  // Insider trades are public Form 4 filings. Congress data stays aggregated per stock
  // (Bargo's terms do not allow republishing their raw rows).
  const insiderFeed = []
  for (const [symbol, sum] of insider.byTicker) {
    const r = recBySymbol.get(symbol)
    for (const t of sum.recent ?? []) insiderFeed.push({ symbol, company: r?.name ?? tickers.name(symbol) ?? symbol, ...t, cluster: (sum.buyers ?? 0) >= 3 && t.code === 'P' })
  }
  insiderFeed.sort((a, b) => b.filed.localeCompare(a.filed) || b.value - a.value)
  const congressTotals = [...congress.byTicker.entries()]
    .map(([symbol, a]) => ({ symbol, company: recBySymbol.get(symbol)?.name ?? tickers.name(symbol) ?? symbol, buys: a.buys, sells: a.sells, buyers: a.buyers, sellers: a.sellers, leaders: a.leaders, leaderBuys: a.leaderBuys, leaderSells: a.leaderSells, latest: a.latest, net: Math.round(a.net * 100) / 100, ranked: recBySymbol.has(symbol) }))
    .sort((a, b) => b.buys + b.sells - (a.buys + a.sells))
    .slice(0, 120)
  log(`hot: ${hot.items.length} stocks, ipos: ${ipoList.items.length} (${ipoScored.length} old enough to score)`)

  // ---- today's intraday incl. pre-market / after-hours -----------------------
  const intradaySymbols = [
    ...BENCHMARKS.map((b) => b.symbol),
    ...recommendations.slice(0, 30).map((r) => r.symbol),
    ...hot.items.slice(0, 15).map((h) => h.symbol),
    ...ipoList.items.filter((i) => i.price).slice(0, 10).map((i) => i.symbol),
  ].filter((s, i, a) => a.indexOf(s) === i)
  const intraday = await safe('intraday', () => intradaySrc.loadIntraday(intradaySymbols), { bySymbol: new Map() })

  let output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    buildMs: Date.now() - started,
    weights: WEIGHTS,
    sources: {
      congress: sourceStatus(congress, congressSrc.attribution),
      insider: sourceStatus(insider, insiderSrc.attribution),
      contracts: sourceStatus(contracts, contractsSrc.attribution),
      lobbying: sourceStatus(lobbyTrend.count ? { ...lobbyTrend, count: lobbyTrend.count } : lobbying, lobbyingSrc.attribution),
      social: sourceStatus(social, socialSrc.attribution),
      prices: sourceStatus(prices, pricesSrc.attribution),
      intraday: sourceStatus(intraday, intradaySrc.attribution),
      earnings: sourceStatus(earnings, earningsSrc.attribution),
      ipos: sourceStatus(ipos, iposSrc.attribution),
    },
    market,
    backtest,
    track: trackRecord,
    hot,
    ipos: ipoList,
    insiders: { items: insiderFeed.slice(0, 400) },
    congress: { items: congressTotals },
    intraday: Object.fromEntries(intraday.bySymbol),
    recommendations,
  }

  if (recommendations.length === 0) {
    const lastGood = await readCache('last-good-output')
    if (lastGood) {
      log('no recommendations this run, re-publishing last good output')
      output = { ...lastGood.data, sources: output.sources, stale: true }
    }
  } else {
    await writeCache('last-good-output', output)
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(output))
  // Publish the track-record log so a fresh machine or cache continues where the live site is.
  if (trackLog.length) await writeFile(`${dirname(OUT)}/track.json`, JSON.stringify({ updatedAt: new Date().toISOString(), log: trackLog }))
  // Publish the lobbying summary so runs on networks that lda.gov refuses can reuse it.
  if (lobbying.ok && !lobbying.mirrored && lobbying.byTicker.size > 0) {
    await writeFile(`${dirname(OUT)}/lobbying.json`, JSON.stringify(lobbyingSrc.mirrorPayload(lobbying, lobbyTrend)))
  }
  log(`wrote ${OUT}: ${output.recommendations.length} stocks in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

main().catch((err) => {
  console.error('[signals] fatal', err)
  process.exit(1)
})
