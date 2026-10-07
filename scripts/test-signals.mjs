#!/usr/bin/env node
// Offline test: stubs fetch with tiny fixtures and checks the pipeline output shape.
//   node scripts/test-signals.mjs
// Writes only to a temp folder; never touches public/data.
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const dir = await mkdtemp(join(tmpdir(), 'signals-test-'))
process.env.SIGNALS_CACHE_DIR = join(dir, 'cache')
process.env.SIGNALS_OUT = process.env.SIGNALS_TEST_OUT || join(dir, 'signals.json')
process.env.FINNHUB_API_KEY = 'test'

const day = 86400000
const iso = (d) => new Date(d).toISOString().slice(0, 10)
const now = Date.now()

function chart(start, drift, seed) {
  let p = start
  let s = seed
  const ts = []
  const close = []
  for (let i = 260; i >= 0; i--) {
    s = (s * 9301 + 49297) % 233280
    p *= 1 + drift + ((s / 233280) - 0.5) * 0.03
    ts.push(Math.floor((now - i * day) / 1000))
    close.push(p)
  }
  return { chart: { result: [{ meta: { longName: null }, timestamp: ts, indicators: { quote: [{ close, volume: close.map(() => 1e6) }] } }] } }
}

const fixtures = [
  [/sec\.gov/, () => ({
    0: { ticker: 'NVDA', title: 'NVIDIA CORP' },
    1: { ticker: 'LMT', title: 'LOCKHEED MARTIN CORP' },
    2: { ticker: 'PLTR', title: 'Palantir Technologies Inc.' },
    3: { ticker: 'AAPL', title: 'Apple Inc.' },
    4: { ticker: 'GME', title: 'GameStop Corp.' },
    5: { ticker: 'NOC', title: 'NORTHROP GRUMMAN CORP /DE/' },
    6: { ticker: 'MSFT', title: 'MICROSOFT CORP' },
    7: { ticker: 'SPY', title: 'SPDR S&P 500 ETF TRUST' },
  })],
  [/bargo\.ai/, () => ({
    trades: [
      { member_slug: 'a', ticker: 'NVDA', type: 'purchase', amount_range: '$50,001 - $100,000', transaction_date: iso(now - 5 * day) },
      { member_slug: 'b', ticker: 'NVDA', type: 'purchase', amount_range: '$15,001 - $50,000', transaction_date: iso(now - 12 * day) },
      { member_slug: 'c', ticker: 'PLTR', type: 'purchase', amount_range: '$1,001 - $15,000', transaction_date: iso(now - 20 * day) },
      { member_slug: 'a', ticker: 'AAPL', type: 'sale (full)', amount_range: '$100,001 - $250,000', transaction_date: iso(now - 8 * day) },
    ],
    page: 0, limit: 100, count: 4,
  })],
  [/apewisdom/, () => ({ count: 2, pages: 1, current_page: 1, results: [
    { rank: 1, ticker: 'GME', name: 'GameStop', mentions: 900, mentions_24h_ago: 200, upvotes: 5000 },
    { rank: 2, ticker: 'NVDA', name: 'NVIDIA', mentions: 400, mentions_24h_ago: 350, upvotes: 2000 },
  ] })],
  [/usaspending/, () => ({ results: [
    { 'Recipient Name': 'LOCKHEED MARTIN CORPORATION', 'Award Amount': 850000000, 'Awarding Agency': 'Department of Defense' },
    { 'Recipient Name': 'NORTHROP GRUMMAN SYSTEMS CORPORATION', 'Award Amount': 120000000, 'Awarding Agency': 'Department of Defense' },
    { 'Recipient Name': 'SOME PRIVATE LLC', 'Award Amount': 90000000, 'Awarding Agency': 'GSA' },
  ], page_metadata: { hasNext: false } })],
  [/lda\.gov/, () => ({ next: null, results: [
    { client: { name: 'PALANTIR TECHNOLOGIES INC.' }, registrant: { name: 'X LLC' }, income: 300000, dt_posted: new Date().toISOString() },
  ] })],
  [/finnhub.*symbol=NVDA/, () => ({ data: [
    { name: 'CEO', transactionCode: 'P', change: 10000, transactionPrice: 120, transactionDate: iso(now - 3 * day) },
  ] })],
  [/finnhub/, () => ({ data: [] })],
  [/yahoo.*\/(SPY|QQQ|DIA|IWM)\?/, (u) => chart(400, 0.0007, u.length)],
  [/yahoo.*\/NVDA\?/, () => chart(100, 0.002, 7)],
  [/yahoo.*\/AAPL\?/, () => chart(200, -0.001, 3)],
  [/yahoo/, (u) => chart(50, 0.0003, u.length * 13)],
]

const calls = []
globalThis.fetch = async (url) => {
  calls.push(String(url))
  const hit = fixtures.find(([re]) => re.test(String(url)))
  if (!hit) return new Response('not found', { status: 404 })
  return new Response(JSON.stringify(hit[1](String(url))), { status: 200 })
}

// http.mjs sleeps between calls; speed it up
const realSetTimeout = globalThis.setTimeout
globalThis.setTimeout = (fn, ms, ...rest) => realSetTimeout(fn, Math.min(ms, 5), ...rest)

await import('./build-signals.mjs')
// main() is async inside the module; wait for the file
let out
for (let i = 0; i < 200 && !out; i++) {
  await new Promise((r) => realSetTimeout(r, 25))
  out = await readFile(process.env.SIGNALS_OUT, 'utf8').then(JSON.parse).catch(() => null)
  if (out && new Date(out.generatedAt).getTime() < now) out = null // an older file from a previous run
}
assert.ok(out, 'output written')
assert.equal(out.version, 1)
for (const k of ['congress', 'insider', 'contracts', 'lobbying', 'social', 'prices']) assert.ok(out.sources[k], `source ${k}`)
assert.ok(out.sources.congress.ok && out.sources.social.ok && out.sources.contracts.ok, 'sources ok')
assert.ok(out.market.indices.length === 4, 'four benchmarks')
assert.ok(['risk-on', 'neutral', 'risk-off'].includes(out.market.regime))
const syms = out.recommendations.map((r) => r.symbol)
assert.ok(syms.includes('NVDA') && syms.includes('LMT') && syms.includes('NOC') && syms.includes('PLTR'), `universe: ${syms}`)
assert.ok(!syms.includes('SPY'), 'benchmarks excluded')
const nvda = out.recommendations.find((r) => r.symbol === 'NVDA')
assert.ok(nvda.components.congress.score > 0 && nvda.components.insider.score > 0, 'nvda signals')
assert.ok(nvda.reasons.length >= 2, 'nvda reasons')
const lmt = out.recommendations.find((r) => r.symbol === 'LMT')
assert.ok(lmt.components.contracts.score > 0.5, 'lmt contracts')
const pltr = out.recommendations.find((r) => r.symbol === 'PLTR')
assert.ok(pltr.components.lobbying.score > 0, 'pltr lobbying')
assert.ok(out.recommendations[0].score >= out.recommendations.at(-1).score, 'sorted')
assert.ok(nvda.price.history.length === 260 && nvda.price.sma200 > 0, 'history')
assert.ok(!JSON.stringify(out).includes('token=test'), 'no keys leaked')
for (const r of out.recommendations) {
  const pl = r.plan
  assert.ok(pl, `plan for ${r.symbol}`)
  assert.ok(['buy-now', 'pullback', 'wait', 'avoid'].includes(pl.action), `action ${pl.action}`)
  assert.ok(pl.stop < pl.entryLow && pl.entryLow <= pl.entryHigh && pl.entryHigh < pl.target1 && pl.target1 < pl.target2, `levels ordered for ${r.symbol}: ${JSON.stringify(pl)}`)
  assert.ok(pl.positionPct > 0 && pl.positionPct <= 0.2, 'position size capped')
  assert.ok(pl.exitRules.length >= 5, 'exit rules')
}
console.log(`OK: ${out.recommendations.length} recs, top ${out.recommendations.slice(0, 3).map((r) => `${r.symbol}:${r.score}`).join(' ')}, ${calls.length} stubbed calls`)
