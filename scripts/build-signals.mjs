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
import { marketRegime, scoreStock, technicals, WEIGHTS } from './signals/score.mjs'
import { tradePlan } from './signals/plan.mjs'
import { readCache, writeCache } from './signals/cache.mjs'

const OUT = process.env.SIGNALS_OUT || 'public/data/signals.json'
const MAX_CANDIDATES = 45
const CORE = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'JPM', 'LLY']
const BENCHMARKS = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'Nasdaq 100' },
  { symbol: 'IWM', name: 'Russell 2000' },
  { symbol: 'DIA', name: 'Dow Jones' },
]
const HISTORY_BARS = 260

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
    const current = existing?.recommendations?.[0]?.plan !== undefined
    if (info && current && existing.recommendations.length > 0 && Date.now() - info.mtimeMs < 6 * 3600000) {
      log(`${OUT} is recent, skipping (run "npm run signals" to refresh)`)
      return
    }
    log('no recent signals.json, building it now (about a minute)...')
  }

  let tickers
  try {
    tickers = await loadTickers()
  } catch (err) {
    log(`SEC ticker list failed (${err.message}), name matching disabled`)
    tickers = { has: (t) => /^[A-Z]{1,5}$/.test(t), name: () => null, match: () => null }
  }

  const [congress, social, contracts, lobbying] = await Promise.all([
    safe('congress', () => congressSrc.loadCongress()),
    safe('social', () => socialSrc.loadSocial()),
    safe('contracts', () => contractsSrc.loadContracts(tickers)),
    safe('lobbying', () => lobbyingSrc.loadLobbying(tickers)),
  ])

  // ---- candidate universe -------------------------------------------------
  const picks = []
  const add = (list) => list.forEach((t) => picks.push(t))
  add(
    [...congress.byTicker.entries()]
      .filter(([, a]) => a.net > 0)
      .sort((a, b) => b[1].net - a[1].net)
      .slice(0, 15)
      .map(([t]) => t),
  )
  add(
    [...social.byTicker.values()]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 12)
      .map((r) => r.ticker),
  )
  add([...contracts.byTicker.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 8).map(([t]) => t))
  add([...lobbying.byTicker.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 6).map(([t]) => t))
  add(CORE)

  const benchSymbols = new Set(BENCHMARKS.map((b) => b.symbol))
  const candidates = [...new Set(picks)]
    .filter((t) => /^[A-Z]{1,5}(\.[A-Z])?$/.test(t) && tickers.has(t) && !benchSymbols.has(t))
    .slice(0, MAX_CANDIDATES)
  log(`candidates: ${candidates.length}`)

  const [insider, prices] = await Promise.all([
    safe('insider', () => insiderSrc.loadInsider(candidates)),
    safe('prices', () => pricesSrc.loadPrices([...benchSymbols, ...candidates]), { bySymbol: new Map() }),
  ])

  // ---- market -------------------------------------------------------------
  const indices = BENCHMARKS.map((b) => {
    const p = prices.bySymbol.get(b.symbol)
    if (!p) return null
    const t = technicals(p.bars)
    return { ...b, ...t, history: packHistory(p.bars) }
  }).filter(Boolean)
  const market = { ...marketRegime(indices), indices }

  // ---- score ----------------------------------------------------------------
  const recommendations = candidates
    .map((symbol) => {
      const p = prices.bySymbol.get(symbol)
      const tech = p ? technicals(p.bars) : null
      const rec = scoreStock({
        symbol,
        name: p?.name || tickers.name(symbol) || symbol,
        tech,
        congress: congress.byTicker.get(symbol),
        insider: insider.byTicker.get(symbol),
        social: social.byTicker.get(symbol),
        contracts: contracts.byTicker.get(symbol),
        lobbying: lobbying.byTicker.get(symbol),
        regime: market.regime,
      })
      return {
        ...rec,
        price: tech ? { ...tech, history: packHistory(p.bars) } : null,
        plan: tech ? tradePlan(p.bars.map((b) => b[1]), tech, rec.rating) : null,
      }
    })
    .filter((r) => r.price) // can't recommend what we can't chart
    .sort((a, b) => b.score - a.score || b.agreeing - a.agreeing)

  let output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    buildMs: Date.now() - started,
    weights: WEIGHTS,
    sources: {
      congress: sourceStatus(congress, congressSrc.attribution),
      insider: sourceStatus(insider, insiderSrc.attribution),
      contracts: sourceStatus(contracts, contractsSrc.attribution),
      lobbying: sourceStatus(lobbying, lobbyingSrc.attribution),
      social: sourceStatus(social, socialSrc.attribution),
      prices: sourceStatus(prices, pricesSrc.attribution),
    },
    market,
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
  log(`wrote ${OUT}: ${output.recommendations.length} stocks in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

main().catch((err) => {
  console.error('[signals] fatal', err)
  process.exit(1)
})
