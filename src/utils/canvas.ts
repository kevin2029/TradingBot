export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r},${g},${b},${alpha})`
}
