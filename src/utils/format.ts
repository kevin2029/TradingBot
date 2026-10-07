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
