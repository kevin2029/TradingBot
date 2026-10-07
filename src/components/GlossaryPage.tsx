import { useState } from 'react'
import { Card, inputStyle } from '../ui/Primitives'
import { PageHead } from './Page'

interface Term {
  term: string
  also?: string
  text: string
}

const GROUPS: { title: string; terms: Term[] }[] = [
  {
    title: 'The score',
    terms: [
      { term: 'Score', text: 'A number from 0 to 100 that sums up six signals, each weighted by how well research says it predicts returns. 50 is neutral. 68 or more is a strong buy, 58 a buy, 45 watch, below that avoid. Missing data counts as neutral.' },
      { term: 'Momentum (12-1 month)', also: '12-month momentum', text: 'The return from twelve months ago to one month ago. The last month is skipped because very recent winners often dip back. Stocks that rose most over the past year tend to keep outperforming for months; one of the most tested effects in finance.' },
      { term: '52-week high', text: 'The highest price of the past year. Stocks trading close to it tend to do better than those far below it: buyers anchor on that level and react late to good news.' },
      { term: 'Percentile', text: 'Where a stock ranks within the list, from 0% (lowest) to 100% (highest). "Top 10% momentum" means only one in ten ranked stocks did better.' },
      { term: 'Opportunistic insider trade', also: 'Unusual', text: 'A purchase or sale that breaks an insider\'s usual yearly pattern. These carry information; routine trades in the same month every year do not.' },
      { term: 'Cluster buying', text: 'Three or more insiders buying the same stock within 90 days. A stronger signal than one buyer.' },
      { term: 'Form 4', text: 'The SEC filing insiders must make within two business days of trading their own company\'s stock.' },
      { term: 'Congress leaders', text: 'Party and committee leaders in the House and Senate. Studies find their trades beat the market while ordinary members\' trades do not, so leaders count fully and others only a little.' },
      { term: 'Lobbying trend', text: 'How a company\'s lobbying spend this year compares with the same period last year. A rising budget often comes before policy news; the level alone says little.' },
      { term: 'WSB buzz', text: 'Mentions on the r/wallstreetbets forum. Heavy attention tends to come before weaker returns, so in the score it can only lower a stock, never raise it.' },
    ],
  },
  {
    title: 'The plan',
    terms: [
      { term: 'Entry zone', text: 'The price range where the plan says buying makes sense. Above it you would be chasing; below it the stock may still be falling.' },
      { term: 'Buy now / Buy on a dip / Wait for breakout / Don\'t buy', text: 'Buy now: trend and signals agree and the price is not stretched. Buy on a dip: good, but wait for a pullback into the zone. Wait for breakout: below the 50-day average, buy only after a close above it on strong volume. Don\'t buy: signals are weak.' },
      { term: 'Stop loss', also: 'Stop', text: 'The price at which you sell to cap the loss. The plan places it below the recent swing low, 3 to 4 ATR below entry: wide enough that normal daily noise does not knock you out.' },
      { term: 'Trailing stop', text: 'After selling half at target 1, the stop follows the price up: 3 ATR below the highest close since you bought, never below your entry. It lets winners run and locks in gains.' },
      { term: 'Target 1 / Reference target', text: 'Target 1 is twice the risk above entry: sell half there. The reference target (3.5 times the risk, or the 52-week high) is a sensible place to take more profit if the trend stalls.' },
      { term: 'R (risk unit)', also: 'R', text: 'Profit or loss measured in units of what you risked. If the stop was $5 below your entry and you made $10 a share, that is +2R. A plan works when its average R is above zero.' },
      { term: 'Reward to risk', text: 'How far the target is from entry compared with how far the stop is. 2 to 1 means you aim to make twice what you risk.' },
      { term: 'Position size', text: 'How much of your account to put in, sized so hitting the stop costs about 1% of the account. Never more than 20% in one stock, halved in a weak market.' },
      { term: 'Time stop', text: 'If target 1 is not reached within 30 trading days, the plan suggests freeing up the money for a better idea.' },
      { term: 'Gap', text: 'When a stock opens far from the previous close, often after earnings. A gap can jump straight past a stop, which is why the plan avoids new entries just before a report.' },
      { term: 'Lock-up', text: 'A period after an IPO (usually about 180 days) in which early investors may not sell. Prices often drop when it ends.' },
    ],
  },
  {
    title: 'Chart and numbers',
    terms: [
      { term: 'ATR (average true range)', also: 'ATR', text: 'How much a stock typically moves in a day, including gaps, averaged over 14 days. Stops and targets are set in ATR so they fit each stock\'s own volatility.' },
      { term: 'Daily swing', text: 'The ATR as a share of the price. 2% means a typical day moves about 2%. Above 3.5% is volatile, above 6% very volatile.' },
      { term: '50-day and 200-day average', text: 'The average closing price over the last 50 or 200 trading days. Above the 200-day means a long-term uptrend; the 50-day shows the medium-term trend.' },
      { term: 'RSI', text: 'Relative Strength Index, from 0 to 100, measuring the last 14 days of gains against losses. Above 70 is stretched (wait for a dip), above 80 the score takes a small penalty.' },
      { term: 'Relative strength vs S&P 500', also: 'vs S&P 500', text: 'A stock\'s 3-month return minus the S&P 500\'s. Positive means it beat the market.' },
      { term: 'Volume', text: 'How many shares traded. A breakout on high volume (1.5 times the 20-day average or more) is more likely to hold.' },
    ],
  },
  {
    title: 'Market and results',
    terms: [
      { term: 'Risk on / Neutral / Risk off', text: 'The market trend from the S&P 500: risk on above its 50 and 200-day averages, risk off below the 200-day. In risk off every score drops 5 points and position sizes are halved.' },
      { term: 'Pre-market and after hours', text: 'Trading before the open (4:00 to 9:30 New York time) and after the close (16:00 to 20:00). Prices move on less volume, so they can be jumpy.' },
      { term: 'Backtest', text: 'The plan rules replayed on two years of past prices. It uses the chart signal only, without costs, so it shows whether the rules make sense, not what you will earn.' },
      { term: 'Track record', text: 'Every Buy recommendation logged with its price on the day and checked after 1, 4 and 8 weeks against the S&P 500. The honest test of the whole app.' },
      { term: 'Win rate and profit factor', text: 'Win rate: share of trades that made money. Profit factor: total gains divided by total losses; above 1 means the rules made more than they lost.' },
      { term: 'IPO', text: 'Initial public offering: a company\'s first day on the stock market. Too new to score until it has about 3 months of prices.' },
    ],
  },
]

export function GlossaryPage() {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const groups = GROUPS.map((g) => ({ ...g, terms: g.terms.filter((t) => !query || t.term.toLowerCase().includes(query) || t.also?.toLowerCase().includes(query) || t.text.toLowerCase().includes(query)) })).filter((g) => g.terms.length)
  return (
    <main className="page" style={{ maxWidth: 900 }}>
      <PageHead title="Glossary" sub="What the terms in the app mean, in plain words." />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms, e.g. ATR or stop" aria-label="Search the glossary" style={{ ...inputStyle, height: 40, border: 'none', background: 'var(--seg-track)', maxWidth: 420 }} />
      {groups.length === 0 && <div className="t-sub">No term matches "{q}".</div>}
      {groups.map((g) => (
        <section key={g.title}>
          <div className="t-headline" style={{ marginBottom: 10 }}>
            {g.title}
          </div>
          <Card padding={6}>
            {g.terms.map((t, i) => (
              <div key={t.term} style={{ padding: '14px 16px', borderTop: i ? '1px solid var(--hairline)' : 'none' }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{t.term}</div>
                <div style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 4 }}>{t.text}</div>
              </div>
            ))}
          </Card>
        </section>
      ))}
    </main>
  )
}
