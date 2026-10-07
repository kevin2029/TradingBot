import type { CSSProperties, ReactNode } from 'react'

/** Numbers line up (tabular figures) in the system font. Name kept from the old mono font. */
export const mono: CSSProperties = { fontVariantNumeric: 'tabular-nums' }

export function Card({
  children,
  padding = 20,
  style,
  className,
}: {
  children: ReactNode
  padding?: number
  style?: CSSProperties
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface)',
        border: '1px solid transparent',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '.03em',
        color: 'var(--faint)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}

export function StatusDot({ color, pulse }: { color: string; pulse?: string }) {
  return (
    <div
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        animation: pulse ? `bp ${pulse} infinite` : undefined,
        flexShrink: 0,
      }}
    />
  )
}

export function StatusPill({
  color,
  background,
  label,
  pulse,
}: {
  color: string
  background: string
  label: string
  pulse?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px 5px 10px',
        borderRadius: 999,
        background,
      }}
    >
      <StatusDot color={color} pulse={pulse} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color }}>{label}</span>
    </div>
  )
}

export interface SegOption<T extends string> {
  value: T
  label: string
  activeColor?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  height = 34,
  fontSize = 13,
}: {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
  height?: number
  fontSize?: number
}) {
  const n = options.length
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const active = options[index]
  return (
    <div
      role="tablist"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${n}, 1fr)`,
        gap: 2,
        padding: 2,
        background: 'var(--seg-track)',
        borderRadius: 10,
      }}
    >
      {/* one pill that slides to the active option instead of each button swapping its background */}
      <div
        aria-hidden
        className="seg-indicator"
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          height,
          width: `calc((100% - 4px - ${(n - 1) * 2}px) / ${n})`,
          transform: `translateX(calc(${index} * (100% + 2px)))`,
          borderRadius: 8,
          background: 'var(--seg-thumb)',
          boxShadow: '0 3px 8px rgba(0,0,0,.12), 0 3px 1px rgba(0,0,0,.04)',
          transition: 'transform var(--dur-ui) var(--ease-in-out)',
        }}
      />
      {options.map((opt) => {
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(opt.value)}
            style={{
              position: 'relative',
              height,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize,
              fontWeight: on ? 600 : 500,
              background: 'transparent',
              color: on ? active.activeColor ?? 'var(--text)' : 'var(--text)',
              padding: '0 8px',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function NavSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 3,
        padding: 3,
        background: 'var(--inset)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        marginRight: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              height: 28,
              padding: '0 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--muted)',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,.18)' : 'none',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  onColor = 'var(--info)',
}: {
  checked: boolean
  onChange: () => void
  onColor?: string
}) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44,
        height: 25,
        borderRadius: 999,
        padding: 2,
        border: `1px solid ${checked ? 'transparent' : 'var(--border2)'}`,
        background: checked ? onColor : 'var(--surface2)',
        cursor: 'pointer',
        transition: 'background-color var(--dur-ui) ease, border-color var(--dur-ui) ease, transform var(--dur-press) var(--ease-out)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 19,
          height: 19,
          borderRadius: '50%',
          background: '#fff',
          transition: 'transform var(--dur-ui) var(--ease-in-out)',
          transform: checked ? 'translateX(19px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

export function MasterToggle({
  checked,
  trackColor,
  borderColor,
  onChange,
}: {
  checked: boolean
  trackColor: string
  borderColor: string
  onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      style={{
        flexShrink: 0,
        width: 78,
        height: 42,
        borderRadius: 999,
        border: `1px solid ${borderColor}`,
        background: trackColor,
        padding: 3,
        cursor: 'pointer',
        transition: 'background-color var(--dur-ui) ease, border-color var(--dur-ui) ease, transform var(--dur-press) var(--ease-out)',
        display: 'block',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,.28)',
          transition: 'transform var(--dur-ui) var(--ease-in-out)',
          transform: checked ? 'translateX(36px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

export function Chip({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--muted)',
        background: 'var(--surface2)',
        border: '1px solid transparent',
        borderRadius: 6,
        padding: '2px 7px',
        letterSpacing: '.01em',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{children}</label>
}

export const inputStyle: CSSProperties = {
  height: 40,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--inset)',
  color: 'var(--text)',
  fontSize: 14,
  margin: 0,
  width: '100%',
  padding: '0 12px',
}

/** Small label above a value: sentence case, quiet. */
export const LABEL: CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--muted)', letterSpacing: 0 }

/** "VS S&P (3M)" -> "vs S&P (3M)", "STOP LOSS" -> "Stop loss": old uppercase labels read calmer in sentence case. */
export function prettyLabel(label: string) {
  const lower = label.toLowerCase()
  let s = lower.charAt(0).toUpperCase() + lower.slice(1)
  s = s.replace(/\b(atr|rsi|s&p|wsb|ipo|sma|r)\b/gi, (m) => m.toUpperCase()).replace(/\b(\d+)m\b/g, '$1M').replace(/^Vs\b/, 'vs')
  return s
}
