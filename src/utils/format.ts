export function formatMoney(value: number, dp = 2): string {
  const sign = value < 0 ? '−' : ''
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`
}

export function formatSigned(value: number, dp = 2, unit = ''): string {
  const sign = value < 0 ? '−' : '+'
  return `${sign}${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}${unit}`
}

export function formatPrice(value: number, dollarPrefix: boolean): string {
  return `${dollarPrefix ? '$' : ''}${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatClock(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-GB', { hour12: false })
}

export function formatHM(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })
}

export function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `UP ${pad(h)}:${pad(m)}:${pad(s)}`
}

export function rnd(amplitude: number): number {
  return (Math.random() * 2 - 1) * amplitude
}

export function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}
