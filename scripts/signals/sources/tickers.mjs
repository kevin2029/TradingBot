// SEC's public ticker list: used to validate tickers and to map company names
// (contract recipients, lobbying clients) to stock symbols.
import { getJson } from '../http.mjs'
import { cached, HOUR } from '../cache.mjs'

const SUFFIXES = new Set([
  'INC', 'INCORPORATED', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'COMPANIES', 'LLC', 'LTD', 'LIMITED', 'PLC',
  'LP', 'LLP', 'HOLDINGS', 'HOLDING', 'GROUP', 'THE', 'NV', 'SA', 'AG', 'SE', 'CLASS', 'COM', 'USA', 'US',
])

// Well known recipients whose legal name does not match the listed parent.
const ALIASES = {
  RAYTHEON: 'RTX',
  'RAYTHEON TECHNOLOGIES': 'RTX',
  'GOOGLE': 'GOOGL',
  'FACEBOOK': 'META',
  'AMAZON WEB SERVICES': 'AMZN',
  'AMAZONCOM': 'AMZN',
  'SIKORSKY AIRCRAFT': 'LMT',
  'ELECTRIC BOAT': 'GD',
  'GULFSTREAM AEROSPACE': 'GD',
  'BATH IRON WORKS': 'GD',
  'PRATT WHITNEY': 'RTX',
  'COLLINS AEROSPACE': 'RTX',
  'HUNTINGTON INGALLS': 'HII',
  'L3HARRIS TECHNOLOGIES': 'LHX',
  'HUMANA': 'HUM',
  'MCKESSON': 'MCK',
  'PFIZER': 'PFE',
}

export function normalizeName(name) {
  const tokens = String(name || '')
    .toUpperCase()
    .replace(/\/[A-Z]{2,3}\/?/g, ' ') // SEC state suffixes like "/DE/"
    .replace(/&/g, ' ')
    .replace(/[^A-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  while (tokens.length > 1 && SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop()
  while (tokens.length > 1 && tokens[0] === 'THE') tokens.shift()
  return tokens.join(' ')
}

export async function loadTickers() {
  const { data } = await cached('sec-tickers', 24 * 7 * HOUR, async () => {
    const raw = await getJson('https://www.sec.gov/files/company_tickers.json')
    return Object.values(raw).map((r) => ({ ticker: String(r.ticker).toUpperCase(), title: r.title }))
  })

  const byTicker = new Map()
  const byName = new Map()
  for (const row of data) {
    if (!byTicker.has(row.ticker)) byTicker.set(row.ticker, row.title)
    const norm = normalizeName(row.title)
    // first occurrence is the primary listing (SEC orders by market cap)
    if (norm && !byName.has(norm)) byName.set(norm, row.ticker)
  }
  const multiWord = [...byName.keys()]
    .filter((n) => n.includes(' ') && n.length >= 8 && !/ (OF|AND|FOR)$/.test(n))
    .sort((a, b) => b.length - a.length)

  return {
    has: (t) => byTicker.has(String(t).toUpperCase()),
    name: (t) => byTicker.get(String(t).toUpperCase()),
    /** Map a free-text company name to a ticker, or null. */
    match(name) {
      const norm = normalizeName(name)
      if (!norm) return null
      if (ALIASES[norm]) return ALIASES[norm]
      if (byName.has(norm)) return byName.get(norm)
      for (const [alias, t] of Object.entries(ALIASES)) if (norm.startsWith(alias + ' ')) return t
      // "NORTHROP GRUMMAN SYSTEMS" -> "NORTHROP GRUMMAN"; only multi-word names to limit false hits
      for (const candidate of multiWord) {
        if (norm.startsWith(candidate + ' ')) return byName.get(candidate)
      }
      return null
    },
  }
}
