#!/usr/bin/env node
// Offline test: stubs fetch with tiny fixtures and checks the pipeline output shape.
//   node scripts/test-signals.mjs
// Writes only to a temp folder; never touches public/data.
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { UNIVERSE } from './signals/universe.mjs'

const dir = await mkdtemp(join(tmpdir(), 'signals-test-'))
process.env.SIGNALS_CACHE_DIR = join(dir, 'cache')
process.env.SIGNALS_OUT = process.env.SIGNALS_TEST_OUT || join(dir, 'signals.json')
process.env.FINNHUB_API_KEY = 'test'

const day = 86400000
const iso = (d) => new Date(d).toISOString().slice(0, 10)
const now = Date.now()

function chart(start, drift, seed, n = 520) {
  let p = start
  let s = seed
  const ts = []
  const close = []
  for (let i = n; i >= 0; i--) {
    s = (s * 9301 + 49297) % 233280
    p *= 1 + drift + ((s / 233280) - 0.5) * 0.03
    ts.push(Math.floor((now - i * day) / 1000))
    close.push(p)
  }
  return { chart: { result: [{ meta: { longName: null }, timestamp: ts, indicators: { quote: [{ close, high: close.map((c) => c * 1.012), low: close.map((c) => c * 0.988), volume: close.map(() => 1e6) }] } }] } }
}

function intradayFixture() {
  // pre 04:00-09:30, regular 09:30-16:00, post 16:00-20:00 (as epoch offsets from a fake midnight)
  const day = Math.floor(now / 1000) - 12 * 3600
  const pre = [day + 4 * 3600, day + 9.5 * 3600]
  const reg = [day + 9.5 * 3600, day + 16 * 3600]
  const post = [day + 16 * 3600, day + 20 * 3600]
  const ts = []
  const close = []
  for (let t = pre[0]; t < pre[1] + 2 * 3600; t += 300) {
    ts.push(t)
    close.push(101 + Math.sin(t / 900))
  }
  return { chart: { result: [{ meta: { chartPreviousClose: 100, regularMarketPrice: 101, currentTradingPeriod: { pre: { start: pre[0], end: pre[1] }, regular: { start: reg[0], end: reg[1] }, post: { start: post[0], end: post[1] } } }, timestamp: ts, indicators: { quote: [{ close }] } }] } }
}

function weekFixture() {
  const ts = []
  const close = []
  for (let d = 4; d >= 0; d--) for (let k = 0; k < 13; k++) {
    ts.push(Math.floor(now / 1000) - d * 86400 - (13 - k) * 1800)
    close.push(100 + d + Math.cos(k))
  }
  return { chart: { result: [{ meta: {}, timestamp: ts, indicators: { quote: [{ close }] } }] } }
}

const fixtures = [
  [/finnhub.*calendar\/earnings/, () => ({ earningsCalendar: [{ symbol: 'NVDA', date: iso(now + 3 * day), hour: 'amc' }, { symbol: 'AAPL', date: iso(now + 20 * day), hour: 'bmo' }] })],
  [/finnhub.*calendar\/ipo/, () => ({ ipoCalendar: [
    { symbol: 'NEWCO', name: 'Newco Space Inc', date: iso(now - 140 * day), exchange: 'NASDAQ Global', status: 'priced', price: '21.00', numberOfShares: 20000000, totalSharesValue: 420000000 },
    { symbol: 'FRSH', name: 'Fresh Robotics Corp', date: iso(now - 20 * day), exchange: 'NYSE', status: 'priced', price: '14.00', numberOfShares: 10000000, totalSharesValue: 140000000 },
    { symbol: 'SOON', name: 'Soon Rockets Inc', date: iso(now + 10 * day), exchange: 'NASDAQ Global', status: 'expected', price: '30.00-34.00', numberOfShares: 30000000, totalSharesValue: 1020000000 },
    { symbol: 'BCAQU', name: 'Blue Capital Acquisition Corp', date: iso(now - 5 * day), exchange: 'NASDAQ Capital', status: 'priced', price: '10.00', numberOfShares: 20000000, totalSharesValue: 200000000 },
    { symbol: 'TINY', name: 'Tiny Bio Inc', date: iso(now - 30 * day), exchange: 'NASDAQ Capital', status: 'priced', price: '4.00', numberOfShares: 1000000, totalSharesValue: 4000000 },
  ] })],
  [/finnhub.*profile2.*symbol=(NVDA|AMD|MU)/, () => ({ finnhubIndustry: 'Semiconductors', marketCapitalization: 3000000 })],
  [/finnhub.*profile2.*symbol=(LMT|NOC)/, () => ({ finnhubIndustry: 'Aerospace & Defense', marketCapitalization: 100000 })],
  [/finnhub.*profile2/, () => ({ finnhubIndustry: 'Technology', marketCapitalization: 200000 })],
  [/sec\.gov/, () => ({
    0: { ticker: 'NVDA', title: 'NVIDIA CORP' },
    1: { ticker: 'LMT', title: 'LOCKHEED MARTIN CORP' },
    2: { ticker: 'PLTR', title: 'Palantir Technologies Inc.' },
    3: { ticker: 'AAPL', title: 'Apple Inc.' },
    4: { ticker: 'GME', title: 'GameStop Corp.' },
    5: { ticker: 'NOC', title: 'NORTHROP GRUMMAN CORP /DE/' },
    6: { ticker: 'MSFT', title: 'MICROSOFT CORP' },
    7: { ticker: 'SPY', title: 'SPDR S&P 500 ETF TRUST' },
    // the first 20 universe stocks, so the cross-sectional ranks have enough stocks
    ...Object.fromEntries(UNIVERSE.slice(0, 20).map((t, i) => [100 + i, { ticker: t, title: `${t} HOLDINGS INC` }])),
  })],
  [/bargo\.ai/, () => ({
    trades: [
      { member_slug: 'a', ticker: 'NVDA', type: 'purchase', amount_range: '$50,001 - $100,000', transaction_date: iso(now - 5 * day) },
      { member_slug: 'mike-johnson', member: 'Mike Johnson', ticker: 'NVDA', type: 'purchase', amount_range: '$15,001 - $50,000', transaction_date: iso(now - 12 * day) },
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
  // per-company trend: Palantir spends more this year than in the same period last year
  [/lda\.gov.*client_name=PALANTIR.*filing_year=(\d+)/, (u) => {
    const year = Number(u.match(/filing_year=(\d+)/)[1])
    const amount = year === new Date().getUTCFullYear() ? 400000 : 250000
    return { next: null, results: [{ client: { name: 'PALANTIR TECHNOLOGIES INC.' }, registrant: { id: 1, name: 'X LLC' }, income: amount, filing_period: 'first_quarter', dt_posted: `${year}-04-20` }] }
  }],
  [/lda\.gov.*client_name=/, () => ({ next: null, results: [] })],
  [/lda\.gov/, () => ({ next: null, results: [
    { client: { name: 'PALANTIR TECHNOLOGIES INC.' }, registrant: { name: 'X LLC' }, income: 300000, dt_posted: new Date().toISOString() },
  ] })],
  [/finnhub.*symbol=NVDA/, () => ({ data: [
    { name: 'CEO', transactionCode: 'P', change: 10000, transactionPrice: 120, transactionDate: iso(now - 3 * day) },
  ] })],
  [/finnhub/, () => ({ data: [] })],
  [/yahoo.*range=5d/, () => weekFixture()],
  [/yahoo.*range=1d/, () => intradayFixture()],
  [/yahoo.*\/(SPY|QQQ|DIA|IWM)\?/, (u) => chart(400, 0.0007, u.length)],
  [/yahoo.*\/NVDA\?/, () => chart(100, 0.002, 7)],
  [/yahoo.*\/NEWCO\?/, () => chart(25, 0.003, 11, 95)],
  [/yahoo.*\/FRSH\?/, () => chart(15, -0.002, 5, 14)],
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
assert.ok(pltr.components.lobbying.score > 0 && /same period last year/.test(pltr.components.lobbying.detail), `pltr lobbying trend: ${pltr.components.lobbying.detail}`)
assert.ok(nvda.components.congress.detail.includes('Mike Johnson') || JSON.stringify(nvda.components.congress).includes('Johnson'), 'leader named')
const gme = out.recommendations.find((r) => r.symbol === 'GME')
assert.ok(!gme, 'WSB hype no longer adds stocks')
assert.ok(nvda.components.social.score <= 0, 'WSB only counts as a risk')
assert.ok(syms.includes(UNIVERSE[0]) && out.recommendations.filter((r) => r.universe).length >= 15, 'fixed universe scored')
assert.ok(out.recommendations[0].score >= out.recommendations.at(-1).score, 'sorted')
assert.ok(nvda.price.history.length === 260 && nvda.price.mom12_1 != null && nvda.price.momPct != null && nvda.price.sma200 > 0, 'history')
assert.ok(!JSON.stringify(out).includes('token=test'), 'no keys leaked')
assert.ok(out.sources.intraday.ok, 'intraday source ok')
assert.ok(out.intraday.SPY && out.intraday.SPY.pre && Math.abs(out.intraday.SPY.pre.change) < 0.05, 'pre-market summary')
assert.ok(out.intraday.SPY.bars.length > 10 && out.intraday.SPY.periods.regular, 'intraday bars + periods')
assert.ok(out.intraday.SPY.week.length === 65, `week bars: ${out.intraday.SPY.week.length}`)
// v2 plan, backtest, track record
assert.ok(out.backtest && out.backtest.overall && out.backtest.overall.trades > 0, 'backtest ran')
assert.ok(out.backtest.byAction['buy-now'] && out.backtest.note, 'backtest per action')
for (const k of ['tight', 'wide', 'trend', 'random']) assert.ok(out.backtest.variants?.[k] && typeof out.backtest.variants[k].trades === 'number', `backtest variant ${k}`)
assert.ok(out.backtest.stopMode === 'wide' && out.backtest.spyReturn != null, 'default wide stop and S&P benchmark')
assert.ok(out.track && out.track.days === 1 && out.track.horizons['1w'], 'track record logged today')
assert.ok(out.sources.earnings.ok, 'earnings source')
const nv = out.recommendations.find((r) => r.symbol === 'NVDA')
assert.equal(nv.sector, 'Semiconductors', 'sector')
assert.ok(nv.plan.earnings && nv.plan.earnings.days <= 7, 'earnings attached')
assert.ok(nv.plan.earningsBlock, 'no new entry right before earnings')
assert.ok(nv.plan.warnings.some((w) => w.startsWith('Earnings')), 'earnings warning')
assert.ok(nv.price.atr14 > 0 && nv.price.rs63 != null, 'true ATR and relative strength')
assert.ok(nv.plan.confirm && nv.plan.trailDistance > 0, 'confirmation and trailing stop')
assert.ok(nv.backtest && typeof nv.backtest.trades === 'number', 'per-stock backtest')
// Hot & volatile and new listings
assert.ok(out.hot && out.hot.items.length === 2, `hot items: ${out.hot?.items.length}`)
const hgme = out.hot.items.find((h) => h.symbol === 'GME')
assert.ok(hgme && hgme.rank === 1 && hgme.mentions === 900 && hgme.price.atrPct > 0 && hgme.price.history.length > 0 && hgme.ranking === null, 'GME in hot list, unscored')
assert.ok(out.hot.items.find((h) => h.symbol === 'NVDA').ranking?.score === nvda.score, 'hot item links to the ranking')
assert.ok(out.sources.ipos.ok, 'ipo source')
const ipoSyms = out.ipos.items.map((i) => i.symbol)
assert.deepEqual([...ipoSyms].sort(), ['FRSH', 'NEWCO', 'SOON'], `ipos filtered (no SPAC, no tiny deal): ${ipoSyms}`)
const newco = out.ipos.items.find((i) => i.symbol === 'NEWCO')
assert.ok(newco.listedDays >= 63 && newco.ranking && out.recommendations.find((r) => r.symbol === 'NEWCO')?.newListing, 'old enough IPO joins the ranking')
const frsh = out.ipos.items.find((i) => i.symbol === 'FRSH')
assert.ok(frsh.price && frsh.listedDays < 63 && frsh.ranking === null && !syms.includes('FRSH'), 'too new to score')
const soon = out.ipos.items.find((i) => i.symbol === 'SOON')
assert.ok(soon.price === null && soon.priceLow === 30 && soon.priceHigh === 34 && soon.lockupDate > soon.date, 'upcoming IPO')
// insider feed and Congress totals
const ins = out.insiders?.items.find((t) => t.symbol === 'NVDA')
assert.ok(ins && ins.insider === 'CEO' && ins.code === 'P' && ins.value === 1200000 && ins.kind === 'unclassified', `insider feed: ${JSON.stringify(ins)}`)
const cg = out.congress?.items.find((c) => c.symbol === 'NVDA')
assert.ok(cg && cg.buys === 2 && cg.leaders.includes('Mike Johnson') && cg.ranked, `congress totals: ${JSON.stringify(cg)}`)
assert.ok(!JSON.stringify(out.congress).includes('amount_range') && out.congress.items.every((c) => !('trades' in c)), 'no raw Bargo rows')
for (const r of out.recommendations) {
  const pl = r.plan
  assert.ok(pl, `plan for ${r.symbol}`)
  assert.ok(['buy-now', 'pullback', 'wait', 'avoid'].includes(pl.action), `action ${pl.action}`)
  assert.ok(pl.entryHigh - pl.entryLow >= 0 && (pl.action !== 'pullback' || pl.entryHigh - pl.entryLow >= 0.4 * pl.avgMove), `zone width ${r.symbol}`)
  assert.ok(pl.stop < pl.entryLow && pl.entryLow <= pl.entryHigh && pl.entryHigh < pl.target1 && pl.target1 < pl.target2, `levels ordered for ${r.symbol}: ${JSON.stringify(pl)}`)
  assert.ok(pl.positionPct > 0 && pl.positionPct <= 0.2, 'position size capped')
  assert.ok(pl.exitRules.length >= 5, 'exit rules')
}
console.log(`OK: ${out.recommendations.length} recs, top ${out.recommendations.slice(0, 3).map((r) => `${r.symbol}:${r.score}`).join(' ')}, ${calls.length} stubbed calls`)
