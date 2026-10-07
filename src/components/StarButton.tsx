import { useAppDispatch, useAppState } from '../state/store'
import { StarIcon } from '../ui/Logo'
import { watchItemFor } from '../utils/watch'

/** Star / unstar a stock for the Watchlist. */
export function StarButton({ symbol, label = true }: { symbol: string; label?: boolean }) {
  const { watchlist, signals } = useAppState()
  const dispatch = useAppDispatch()
  const on = watchlist.some((w) => w.symbol === symbol)
  const rec = signals?.recommendations.find((r) => r.symbol === symbol)
  const hot = signals?.hot?.items.find((h) => h.symbol === symbol)
  return (
    <button
      className="tap"
      aria-pressed={on}
      title={on ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={() => dispatch({ type: 'TOGGLE_WATCH', item: watchItemFor(symbol, rec, hot) })}
      style={{
        height: 34,
        padding: label ? '0 14px 0 10px' : 0,
        width: label ? undefined : 34,
        borderRadius: 999,
        border: 'none',
        background: on ? 'var(--warnsoft)' : 'var(--seg-track)',
        color: on ? 'var(--warn)' : 'var(--text)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <StarIcon filled={on} size={18} />
      {label && (on ? 'Watching' : 'Watch')}
    </button>
  )
}
