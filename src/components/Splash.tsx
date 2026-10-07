import { useEffect, useState } from 'react'

const KEY = 'kevision:splash'
const TOTAL_MS = 1900

/** Has the opening animation already played in this tab? */
function seen() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Opening animation, once per browser tab: the eye opens, the signal line draws up,
 * the buy dot lands, the name fades in, then everything fades away. Click or any key skips it.
 */
export function Splash() {
  const [show, setShow] = useState(() => !seen())
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!show) return
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* storage unavailable: it just plays again next time */
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const leaveAt = reduced ? 500 : TOTAL_MS - 320
    const t1 = setTimeout(() => setLeaving(true), leaveAt)
    const t2 = setTimeout(() => setShow(false), leaveAt + 320)
    const skip = () => {
      setLeaving(true)
      setTimeout(() => setShow(false), 200)
    }
    window.addEventListener('keydown', skip, { once: true })
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('keydown', skip)
    }
  }, [show])

  if (!show) return null
  return (
    <div
      className={`splash${leaving ? ' splash-out' : ''}`}
      role="presentation"
      onClick={() => {
        setLeaving(true)
        setTimeout(() => setShow(false), 200)
      }}
    >
      <div className="splash-inner">
        <svg className="splash-icon" width="112" height="112" viewBox="0 0 32 32" aria-label="Kevision">
          <defs>
            <linearGradient id="splash-tile" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2ee6a6" />
              <stop offset="0.55" stopColor="#14b8c4" />
              <stop offset="1" stopColor="#2f6bff" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7.5" fill="url(#splash-tile)" />
          <g className="splash-eye">
            <path d="M4 16.5C8.6 9.6 23.4 9.6 28 16.5C23.4 23.4 8.6 23.4 4 16.5Z" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="16" cy="16.5" r="4.3" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" />
          </g>
          <path className="splash-line" pathLength={1} d="M7 20.5L12 16.5L15.5 18.5L22.5 11" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="splash-dot" cx="23.2" cy="10.3" r="2.9" fill="#fff" />
        </svg>
        <div className="splash-name">Kevision</div>
      </div>
    </div>
  )
}
