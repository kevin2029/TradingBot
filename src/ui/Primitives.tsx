import type { CSSProperties, ReactNode } from 'react'

export const mono: CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" }

export function Card({
  children,
  padding = 20,
  style,
}: {
  children: ReactNode
  padding?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
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
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.1em',
        color: 'var(--faint)',
        textTransform: 'uppercase',
        ...mono,
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
        border: background === 'transparent' ? 'none' : '1px solid var(--border)',
      }}
    >
      <StatusDot color={color} pulse={pulse} />
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', color, ...mono }}>{label}</span>
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
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: 4,
        padding: 4,
        background: 'var(--inset)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              height,
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize,
              fontWeight: 600,
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? opt.activeColor ?? 'var(--text)' : 'var(--muted)',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,.18)' : 'none',
              transition: 'all .15s',
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
        transition: 'all .2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 19,
          height: 19,
          borderRadius: '50%',
          background: '#fff',
          transition: 'transform .2s',
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
        transition: 'background .22s ease, border-color .22s ease',
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
          transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
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
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--faint)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '1px 5px',
        ...mono,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>{children}</label>
}

export const inputStyle: CSSProperties = {
  height: 38,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--inset)',
  color: 'var(--text)',
  fontSize: 13,
  margin: 0,
  width: '100%',
  padding: '0 12px',
}
