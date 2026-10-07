/**
 * Kevision mark: an eye (vision) with a rising signal running through it that
 * ends in a "buy" dot, white on a mint-to-blue tile. Fixed colours so it looks the same in light and dark mode.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Kevision">
      <defs>
        {/* fresh mint to blue: the app's "up" and "info" colours */}
        <linearGradient id="kevision-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2ee6a6" />
          <stop offset="0.55" stopColor="#14b8c4" />
          <stop offset="1" stopColor="#2f6bff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7.5" fill="url(#kevision-tile)" />
      <path d="M4 16.5C8.6 9.6 23.4 9.6 28 16.5C23.4 23.4 8.6 23.4 4 16.5Z" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="16" cy="16.5" r="4.3" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" />
      <path d="M7 20.5L12 16.5L15.5 18.5L22.5 11" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23.2" cy="10.3" r="2.9" fill="#fff" />
    </svg>
  )
}

export function GearIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z" />
    </svg>
  )
}

export function SunIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  )
}

export function MoonIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  )
}

export function BriefcaseIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18" />
    </svg>
  )
}

/** Flame: Hot & new page (popular, volatile and newly listed stocks). */
export function FlameIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3c.5 3-1.5 4.5-3 6.5S6.5 13.5 6.5 15a5.5 5.5 0 0 0 11 0c0-2.5-1.5-4.5-2.5-5.5-.3 1.5-1 2.5-2 3 .5-3-.5-6.5-1-9.5Z" />
    </svg>
  )
}

const ICON = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

/** Overview: a dashboard of tiles. */
export function OverviewIcon() {
  return (
    <svg {...ICON}>
      <rect x="3.5" y="3.5" width="7" height="9" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="2" />
    </svg>
  )
}

/** Stocks: a rising line. */
export function ChartIcon() {
  return (
    <svg {...ICON}>
      <path d="M3.5 17.5 9 12l3.5 3 8-8.5" />
      <path d="M15.5 6.5h5v5" />
    </svg>
  )
}

/** Performance: a target. */
export function TargetIcon() {
  return (
    <svg {...ICON}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

export function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m14.5 5-7 7 7 7" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9.5 5 7 7-7 7" />
    </svg>
  )
}

export function StarIcon({ filled = false, size = 22 }: { filled?: boolean; size?: number }) {
  return (
    <svg {...ICON} width={size} height={size} fill={filled ? 'currentColor' : 'none'}>
      <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
    </svg>
  )
}

export function PeopleIcon() {
  return (
    <svg {...ICON}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="16.8" cy="9.5" r="2.5" />
      <path d="M16.5 14.6c2.2.2 3.6 1.8 4 4.4" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg {...ICON}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

export function GridIcon() {
  return (
    <svg {...ICON}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.8" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.8" />
    </svg>
  )
}

export function ColumnsIcon() {
  return (
    <svg {...ICON}>
      <rect x="3.5" y="4" width="17" height="16" rx="3" />
      <path d="M9.2 4v16M14.8 4v16" />
    </svg>
  )
}

export function BookIcon() {
  return (
    <svg {...ICON}>
      <path d="M4.5 5.5c2.5-1.3 5-1.3 7.5 0v14c-2.5-1.3-5-1.3-7.5 0zM12 5.5c2.5-1.3 5-1.3 7.5 0v14c-2.5-1.3-5-1.3-7.5 0z" />
    </svg>
  )
}

export function QuestionIcon() {
  return (
    <svg {...ICON}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6" />
      <circle cx="12" cy="17" r=".6" fill="currentColor" />
    </svg>
  )
}

export function MoreIcon() {
  return (
    <svg {...ICON}>
      <circle cx="5.5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.3" fill="currentColor" />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
