// Small fetch helpers shared by every data source. Node 20+ (global fetch).

export const USER_AGENT =
  process.env.SEC_USER_AGENT || 'MeridianSignals/1.0 (personal research; github.com/kevin2029/TradingBot)'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export class HttpError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/**
 * fetch with a timeout and a couple of retries on 429/5xx.
 * Returns the Response; callers decide json/text.
 */
export async function request(url, { method = 'GET', headers = {}, body, timeoutMs = 20000, retries = 2 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, text/plain, */*', ...headers },
        body,
        signal: ctrl.signal,
      })
      if (res.status === 429 || res.status >= 500) {
        lastErr = new HttpError(`HTTP ${res.status} for ${redact(url)}`, res.status)
        await sleep(1500 * (attempt + 1))
        continue
      }
      if (!res.ok) throw new HttpError(`HTTP ${res.status} for ${redact(url)}`, res.status)
      return res
    } catch (err) {
      lastErr = err.name === 'AbortError' ? new Error(`Timeout for ${redact(url)}`) : err
      if (err instanceof HttpError && err.status < 500 && err.status !== 429) throw err
      await sleep(1000 * (attempt + 1))
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastErr
}

export async function getJson(url, opts) {
  const res = await request(url, opts)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON from ${redact(url)}: ${text.slice(0, 120)}`)
  }
}

export async function getText(url, opts) {
  const res = await request(url, opts)
  return res.text()
}

/** Strip API tokens from URLs before they end up in logs or the public JSON. */
export function redact(url) {
  return String(url).replace(/(token|apikey|api_key|key)=[^&]+/gi, '$1=***')
}

export function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10)
}

export function daysAgo(n) {
  return new Date(Date.now() - n * 86400000)
}
