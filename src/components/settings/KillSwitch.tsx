import { useAppDispatch } from '../../state/store'

export function KillSwitch() {
  const dispatch = useAppDispatch()

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--down)',
        borderRadius: 14,
        boxShadow: 'var(--shadow)',
        padding: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--down)' }}>Emergency kill switch</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
          Immediately halts the strategy engine, cancels all working orders, and flattens every open position.
        </div>
      </div>
      <button
        onClick={() => dispatch({ type: 'KILL_SWITCH' })}
        style={{
          height: 38,
          padding: '0 18px',
          borderRadius: 9,
          border: 'none',
          background: 'var(--down)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Flatten &amp; halt
      </button>
    </div>
  )
}
