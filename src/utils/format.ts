export function formatPrice(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatSigned(value: number, dp = 2, unit = ''): string {
  const sign = value < 0 ? '−' : '+'
  return `${sign}${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}${unit}`
}

/** 0.0123 -> "+1.23%" */
export function formatPct(fraction: number, dp = 2): string {
  return formatSigned(fraction * 100, dp, '%')
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function formatHM(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(iso: string | number): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}

const KEEP_UPPER = new Set(['LLC', 'PLC', 'ETF', 'USA', 'US', 'NV', 'SA', 'AG', 'SE', 'AB', 'ASA', 'II', 'III', 'REIT', 'SPDR', 'IBM', 'AMD', 'ADR', 'HP', 'UPS', 'CVS'])

/** SEC names come in capitals ("NVIDIA CORP /DE/"): "Nvidia Corp" reads calmer. Mixed-case names are left alone. */
export function prettyName(name: string): string {
  const clean = name.replace(/\s*\/[A-Z]{2,4}\/?\s*$/, '').trim()
  if (clean !== clean.toUpperCase() || !/[A-Z]{3}/.test(clean)) return clean
  return clean
    .split(/\s+/)
    .map((w) => (KEEP_UPPER.has(w.replace(/[^A-Z]/g, '')) || /\d|&/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(' ')
}

/** 1234567 -> "$1.2M" */
export function compactUsd(v: number): string {
  const a = Math.abs(v)
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${Math.round(a / 1e3)}K` : String(Math.round(a))
  return `${v < 0 ? '−' : ''}$${s}`
}

/** "Today", "Yesterday" or "Mon 5 Oct" for a yyyy-mm-dd date. */
export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  const today = new Date()
  const diff = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === -1) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}
