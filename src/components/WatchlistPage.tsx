import { Card, mono } from '../ui/Primitives'
import { useAppDispatch, useAppState } from '../state/store'
import type { WatchItem } from '../types'
import { RATING_META, useLive } from '../utils/signals'
import { formatPct, formatPrice, prettyName } from '../utils/format'
import { needsLook, watchItemFor, watchNotes, type WatchNote } from '../utils/watch'
import { ACTION_META, EARNINGS_META } from './TradePlanCard'
import { ChangeBadge, ScoreBadge } from './RecommendationList'
import { StarButton } from './StarButton'
import { NeedsSignals, PageHead } from './Page'

const TONE: Record<WatchNote['tone'], string> = { good: 'var(--up)', bad: 'var(--down)', warn: 'var(--warn)', info: 'var(--muted)' }

export function WatchlistPage() {
  return (
    <NeedsSignals>
      <Watchlist />
    </NeedsSignals>
  )
}

function Watchlist() {
  const { watchlist, signals, quotes } = useAppState()
  const dispatch = useAppDispatch()
  const recs = signals!.recommendations
  const rows = watchlist
    .map((w) => {
      const rec = recs.find((r) => r.symbol === w.symbol)
      const price = quotes[w.symbol]?.price ?? rec?.price.last ?? signals!.hot?.items.find((h) => h.symbol === w.symbol)?.price.last ?? null
      return { w, rec, notes: watchNotes(w, rec, price) }
    })
    .sort((a, b) => Number(needsLook(b.notes)) - Number(needsLook(a.notes)) || (b.rec?.score ?? 0) - (a.rec?.score ?? 0))
  const looks = rows.filter((r) => needsLook(r.notes)).length
  const suggestions = recs.filter((r) => (r.rating === 'strong-buy' || r.rating === 'buy' || r.rating === 'watch') && !watchlist.some((w) => w.symbol === r.symbol)).slice(0, 6)

  return (
    <main className="page">
      <PageHead
        title="Watchlist"
        sub={
          watchlist.length
            ? `${watchlist.length} stock${watchlist.length === 1 ? '' : 's'} starred${looks ? `, ${looks} worth a look today` : ''}. Changes are shown against the day you starred them. Saved in this browser only.`
            : 'Star stocks you want to follow. They are checked every data run: entry zone reached, rating changes, earnings coming up.'
        }
      />

      {rows.length > 0 && (
        <Card padding={8}>
          {rows.map(({ w, rec, notes }, i) => (
            <WatchRow key={w.symbol} w={w} notes={notes} last={i === rows.length - 1} onOpen={() => (rec ? dispatch({ type: 'OPEN_STOCK', symbol: w.symbol }) : (dispatch({ type: 'SELECT_HOT', symbol: w.symbol }), dispatch({ type: 'SET_VIEW', view: 'hot' })))} />
          ))}
        </Card>
      )}

      {suggestions.length > 0 && (
        <section>
          <div className="t-headline" style={{ marginBottom: 4 }}>
            {watchlist.length ? 'More to consider' : 'Start with these'}
          </div>
          <div className="t-sub" style={{ marginBottom: 12 }}>
            The highest scores you are not watching yet. Tap the star to add, or open a stock and use Watch.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map((r) => (
              <button
                key={r.symbol}
                className="tap"
                onClick={() => dispatch({ type: 'TOGGLE_WATCH', item: watchItemFor(r.symbol, r) })}
                style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', borderRadius: 999, border: 'none', background: 'var(--surface)', boxShadow: 'var(--shadow), 0 0 0 1px var(--hairline)', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}
              >
                <span style={{ color: 'var(--warn)', fontWeight: 700 }}>+</span>
                <b style={{ fontWeight: 600 }}>{r.symbol}</b>
                <span style={{ color: RATING_META[r.rating].color, ...mono }}>{r.score}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function WatchRow({ w, notes, last, onOpen }: { w: WatchItem; notes: WatchNote[]; last: boolean; onOpen: () => void }) {
  const { signals } = useAppState()
  const rec = signals!.recommendations.find((r) => r.symbol === w.symbol)
  const hot = signals!.hot?.items.find((h) => h.symbol === w.symbol)
  const live = useLive(w.symbol, rec?.price ?? hot?.price ?? null)
  const since = w.price && live.last ? live.last / w.price - 1 : null
  const meta = rec ? RATING_META[rec.rating] : null
  const act = rec?.plan ? (rec.plan.earningsBlock ? EARNINGS_META : ACTION_META[rec.plan.action]) : null
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 8 }}>
      <button
        className="tap row"
        onClick={onOpen}
        style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: '12px 10px', border: 'none', borderRadius: 12, background: 'transparent', color: 'var(--text)', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}
      >
        {rec && meta ? <ScoreBadge score={rec.score} color={meta.color} size={44} /> : <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--seg-track)', display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--muted)' }}>n/a</span>}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 650 }}>{w.symbol}</span>
          <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {prettyName(rec?.name ?? hot?.name ?? '')}
            {since != null && (
              <span title={`Starred on ${w.addedAt} at ${formatPrice(w.price!)}`} style={{ color: since >= 0 ? 'var(--up)' : 'var(--down)', ...mono }}>
                {' · '}
                {formatPct(since, 1)} since starred
              </span>
            )}
          </span>
          <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {act && <span style={{ color: act.color, fontWeight: 500 }}>{act.label}</span>}
            {w.score != null && rec && w.score !== rec.score && (
              <span style={{ color: 'var(--faint)' }}>
                {' '}
                · score {w.score} → {rec.score}
              </span>
            )}
          </span>
          {notes.length > 0 && (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 13 }}>
              {notes.map((n) => (
                <span key={n.text} style={{ color: TONE[n.tone], fontWeight: n.tone === 'info' ? 400 : 500 }}>
                  {n.tone !== 'info' && '● '}
                  {n.text}
                </span>
              ))}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 500, ...mono }}>{live.last ? formatPrice(live.last) : '—'}</span>
          {live.last ? <ChangeBadge change={live.change} width={68} /> : null}
        </div>
      </button>
      <StarButton symbol={w.symbol} label={false} />
      {!last && <span aria-hidden style={{ position: 'absolute', left: 66, right: 50, bottom: 0, height: 1, background: 'var(--hairline)' }} />}
    </div>
  )
}
