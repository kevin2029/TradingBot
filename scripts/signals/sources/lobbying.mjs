// Lobbying disclosures (LD-2) from the official LDA API (formerly lda.senate.gov).
// Anonymous access is throttled; set LDA_API_KEY for a higher limit.
// https://lda.gov/api/redoc/v1/
//
// lda.gov has refused scripted requests from some networks (HTTP 403) while a
// browser on the same network works. Requests therefore send browser headers,
// and if lda.gov still refuses, the pipeline falls back to the per-ticker summary
// the live site publishes (data/lobbying.json).
import { getJson, isoDate, daysAgo, sleep, HttpError } from '../http.mjs'
import { cached, readCache, writeCache, HOUR } from '../cache.mjs'
import { normalizeName } from './tickers.mjs'

export const attribution = { label: 'Lobbying: LDA.gov', url: 'https://lda.gov' }

const MIRROR_URL = process.env.LOBBYING_MIRROR_URL || 'https://kevin2029.github.io/TradingBot/data/lobbying.json'
/** After a refusal, don't ask lda.gov again for this long. */
const BLOCK_BACKOFF = 2 * HOUR

// lda.gov answers 403 to some scripted clients on some networks, while a normal
// browser on the same network gets the data. So requests look like a browser.
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://lda.gov/api/',
}

async function fetchFilings() {
  const key = process.env.LDA_API_KEY
  const headers = {
    ...BROWSER_HEADERS,
    ...(key ? { Authorization: `Token ${key}` } : {}),
  }
  const since = isoDate(daysAgo(90))
  const rows = []
  let url = `https://lda.gov/api/v1/filings/?filing_dt_posted_after=${since}&ordering=-dt_posted&page_size=25`
  for (let page = 0; page < (key ? 12 : 6) && url; page++) {
    const json = await getJson(url, { headers, timeoutMs: 30000 })
    for (const f of json.results || []) {
      const amount = Number(f.income || 0) + Number(f.expenses || 0)
      if (f.dt_posted && f.dt_posted.slice(0, 10) < since) continue
      rows.push({ client: f.client?.name, registrant: f.registrant?.name, amount })
    }
    url = json.next || null
    console.log(`[signals] lobbying: page ${page + 1} of ${key ? 12 : 6} (${rows.length} filings)`)
    if (url) await sleep(key ? 500 : 2000)
  }
  return rows
}

function aggregate(rows, tickers) {
  const byTicker = new Map()
  for (const r of rows) {
    // In-house filings list the company as both client and registrant.
    const t = tickers.match(r.client) || tickers.match(r.registrant)
    if (!t) continue
    const agg = byTicker.get(t) || { amount: 0, filings: 0 }
    agg.amount += r.amount
    agg.filings++
    byTicker.set(t, agg)
  }
  return byTicker
}

async function fromMirror(reason) {
  const json = await getJson(MIRROR_URL, { timeoutMs: 20000 })
  if (!json || typeof json.byTicker !== 'object') throw new Error('mirror has no lobbying data yet')
  const byTicker = new Map(Object.entries(json.byTicker))
  return {
    ok: true,
    mirrored: true,
    note: `${reason}; using the live site's copy from ${String(json.generatedAt).slice(0, 10)}`,
    count: json.count ?? byTicker.size,
    fetchedAt: new Date(json.generatedAt).getTime() || Date.now(),
    byTicker,
  }
}

export async function loadLobbying(tickers) {
  const blocked = await readCache('lobbying-blocked')
  const recentlyBlocked = blocked && Date.now() - blocked.savedAt < BLOCK_BACKOFF

  if (!recentlyBlocked) {
    try {
      const res = await cached('lobbying', 24 * HOUR, fetchFilings)
      if (!res.stale) {
        return { ok: true, count: res.data.length, fetchedAt: res.savedAt, byTicker: aggregate(res.data, tickers) }
      }
      // fetch failed but we have older data: remember a refusal and fall through to the mirror if it is fresher
      if (res.error instanceof HttpError && res.error.status === 403) await writeCache('lobbying-blocked', { status: 403 })
      const stale = { ok: false, stale: true, error: res.error?.message, count: res.data.length, fetchedAt: res.savedAt, byTicker: aggregate(res.data, tickers) }
      try {
        const m = await fromMirror('lda.gov refused the request (HTTP 403)')
        return m.fetchedAt > res.savedAt ? m : stale
      } catch {
        return stale
      }
    } catch (err) {
      if (!(err instanceof HttpError && err.status === 403)) throw err
      await writeCache('lobbying-blocked', { status: 403 })
    }
  }

  // lda.gov refuses this network: use the summary published by the live site.
  const old = await readCache('lobbying')
  try {
    return await fromMirror('lda.gov refused the request (HTTP 403)')
  } catch (err) {
    if (old) return { ok: false, stale: true, error: `lda.gov refused the request (HTTP 403) and ${err.message}`, count: old.data.length, fetchedAt: old.savedAt, byTicker: aggregate(old.data, tickers) }
    throw new Error(`lda.gov refused the request (HTTP 403) and the live site's copy is not available yet (${err.message})`)
  }
}

/** Per-ticker summary the live site publishes so local runs can use it (public LDA data). */
export function mirrorPayload(result, trend) {
  return {
    generatedAt: new Date(result.fetchedAt || Date.now()).toISOString(),
    count: result.count,
    byTicker: Object.fromEntries(result.byTicker),
    trend: trend?.byTicker ? Object.fromEntries(trend.byTicker) : undefined,
  }
}

// ---- spending trend per company ----------------------------------------------------
// Research suggests the change in lobbying spend says more than the level. For each
// company we sum this year's reported spend and the same quarters of last year.

const PERIOD_ORDER = ['first_quarter', 'second_quarter', 'third_quarter', 'fourth_quarter', 'mid_year', 'year_end']

async function yearSpend(query, year) {
  const key = process.env.LDA_API_KEY
  const headers = { ...BROWSER_HEADERS, ...(key ? { Authorization: `Token ${key}` } : {}) }
  // registrant + period -> latest amount (amendments replace the original report)
  const best = new Map()
  let url = `https://lda.gov/api/v1/filings/?client_name=${encodeURIComponent(query)}&filing_year=${year}&page_size=25`
  for (let page = 0; page < 4 && url; page++) {
    const json = await getJson(url, { headers, timeoutMs: 30000 })
    for (const f of json.results || []) {
      if (!normalizeName(f.client?.name || '').startsWith(query.toUpperCase())) continue
      const amount = Number(f.income || 0) + Number(f.expenses || 0)
      if (!amount) continue
      const k = `${f.registrant?.id ?? f.registrant?.name}|${f.filing_period}`
      const prev = best.get(k)
      if (!prev || (f.dt_posted || '') > prev.posted) best.set(k, { amount, period: f.filing_period, posted: f.dt_posted || '' })
    }
    url = json.next || null
    if (url) await sleep(key ? 300 : 1500)
  }
  const byPeriod = {}
  for (const v of best.values()) byPeriod[v.period] = (byPeriod[v.period] || 0) + v.amount
  return byPeriod
}

/**
 * @param {Map<string, string>} names ticker -> company name (SEC title)
 * @param {number} maxFetch how many companies to refresh this run (lda.gov is slow and throttled)
 */
export async function loadLobbyingTrend(names, maxFetch = 25) {
  const block = await readCache('lobbying-blocked')
  const blocked = !!block && Date.now() - block.savedAt < BLOCK_BACKOFF
  const byTicker = new Map()
  let fetched = 0
  let errors = 0
  let lastError
  const year = new Date().getUTCFullYear()
  for (const [ticker, title] of names) {
    const query = normalizeName(title).split(' ').slice(0, 2).join(' ')
    if (!query || query.length < 3) continue
    const hit = await readCache(`lobby-trend-${ticker}`)
    const fresh = hit && Date.now() - hit.savedAt < 7 * 24 * HOUR
    if (fresh || blocked || fetched >= maxFetch) {
      if (hit) byTicker.set(ticker, hit.data)
      continue
    }
    try {
      fetched++
      const cur = await yearSpend(query, year)
      const prev = await yearSpend(query, year - 1)
      // compare like for like: only the periods already reported this year
      const periods = PERIOD_ORDER.filter((p) => cur[p] != null)
      const curSum = periods.reduce((a, p) => a + cur[p], 0)
      const prevSum = periods.reduce((a, p) => a + (prev[p] || 0), 0)
      const data = { cur: curSum, prev: prevSum, periods: periods.length, growth: prevSum ? curSum / prevSum - 1 : curSum ? null : 0 }
      await writeCache(`lobby-trend-${ticker}`, data)
      byTicker.set(ticker, data)
    } catch (err) {
      errors++
      lastError = err
      if (err instanceof HttpError && err.status === 403) {
        await writeCache('lobbying-blocked', { status: 403 })
        break
      }
    }
  }
  // lda.gov refused or failed: fill the gaps from the trend the live site published
  let mirrored = false
  if (blocked || errors) {
    try {
      const json = await getJson(MIRROR_URL, { timeoutMs: 20000 })
      for (const [t, d] of Object.entries(json?.trend ?? {})) {
        if (names.has(t) && !byTicker.has(t)) {
          byTicker.set(t, d)
          mirrored = true
        }
      }
    } catch {
      /* no mirror yet */
    }
  }
  const note = [fetched ? `refreshed ${fetched} companies this run` : '', mirrored ? "gaps filled from the live site's data" : ''].filter(Boolean).join(', ')
  return { ok: byTicker.size > 0, error: lastError?.message, note: note || undefined, count: byTicker.size, fetchedAt: Date.now(), byTicker }
}
