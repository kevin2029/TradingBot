# Kevision

A free stock recommendation dashboard. It ranks US stocks by combining public "smart money" disclosures (Congress trades, insider buying, government contracts, lobbying), retail buzz from r/wallstreetbets, and the price chart, then shows **why** each stock scores the way it does. Prices stream in real time in the browser.

> For research only, not financial advice. Scores are a mechanical summary of public data.

## How it works

```
GitHub Actions (hourly, free)                        Browser (GitHub Pages)
┌───────────────────────────────┐                    ┌───────────────────────────────┐
│ scripts/build-signals.mjs     │  signals.json      │ Ranked list + score breakdown │
│  Congress trades   (Bargo)    │ ─────────────────► │ Price chart (1M to 1Y + Live) │
│  Insider trades    (Finnhub)  │                    │                               │
│  Gov contracts     (USASpending)                   │ Finnhub WebSocket ◄── live    │
│  Lobbying          (LDA.gov)  │                    │  ticks with the visitor's own │
│  WSB mentions      (ApeWisdom)│                    │  free key (Settings)          │
│  Daily prices      (Yahoo/Stooq)                   └───────────────────────────────┘
│  → score 0-100 per stock      │
└───────────────────────────────┘
```

- **Scores** are rebuilt by GitHub Actions hourly on weekdays and every 6 hours at weekends. API keys stay in repo secrets, never in the website.
- **Insider feed:** the last 90 days of open-market Form 4 trades per stock are published in `signals.json` (`insiders.items`). Congress trades are published only as totals per stock (`congress.items`), because Bargo's terms do not allow republishing their raw rows
- **Live prices** come from Finnhub's free WebSocket (real-time US trades, up to 50 symbols). Each visitor pastes their own free key in Settings; it stays in their browser.
- The disclosures themselves are not real-time by law: Congress members have up to 45 days to report a trade, insiders 2 business days. Checking hourly is plenty.

## Pages and design

A calm, Apple-like design: system font with aligned numbers, quiet surfaces, color only where it means something (up, down, rating, action), light and dark mode (follows your system until you pick one). The colours come from the logo: its mint is the "up" colour (deepened in light mode so text stays readable) and its blue is the accent for links, buttons and the active page; `--brand-gradient` in `global.css` holds the full mint-to-blue.

| Page | What's on it |
|---|---|
| **Overview** | Market today (trend and summary), the four indices, top ideas with entry and stop, watchlist heads-up, your positions, what's coming up (earnings, IPOs, next 14 days), hot right now, world markets |
| **Stocks** | Searchable, filterable ranking next to the selected stock: chart, key numbers, position plan, why it scores, risks and the six signals. Watch and Compare buttons |
| **Watchlist** | Starred stocks checked against the day you starred them: entry zone reached, rating up or down, earnings within 7 days, return since starring |
| **Positions** | Your logged buys tracked against their plan, plus portfolio risk |
| **More: Hot & new** | Popular and volatile WSB stocks and new listings (speculative, not recommendations) |
| **More: Insider activity** | Latest insider (Form 4) purchases and sales: unusual vs routine vs new pattern, cluster buying, search and filters. Congress trades as totals per stock, leaders highlighted |
| **More: Calendar** | Next six weeks by week: earnings of ranked stocks, IPOs, lock-up expiries, NYSE holidays and early closes. "Mine" shows only stocks you hold or watch |
| **More: Sectors** | Industry strength over 1, 3 or 12 months as a heat map and table, breadth (share above the 50 and 200-day averages), stocks per industry |
| **More: Compare** | Up to three stocks side by side: relative performance chart and a table of price, score, plan, signals and chart numbers, best value in bold |
| **More: Journal** | Closed trades graded against their plan (bought in the zone, respected the stop, took half at target 1, time stop), result in R, cumulative R chart, a note per trade |
| **More: Performance** | Backtest of the plan rules and the live track record |
| **More: Glossary** | Searchable explanations of every term in the app |
| **Settings** | Finnhub key, how the score works, account size, appearance, data sources |

- Desktop: translucent top bar with Overview, Stocks, Watchlist, Positions and a **More** menu, plus the US market status, theme and settings
- Phone: bottom tab bar with the same four pages and **More** (a list of the rest and Settings); the stock list and a stock's page are two screens with a back link
- Watchlist, compare picks, positions and journal notes are stored in this browser only (Export on Positions backs up positions and notes)
- **Opening animation** (once per browser tab, about 1.9 seconds, click or any key skips it): the eye opens, the signal line draws up, the buy dot lands and the name fades in. With reduced motion turned on it only shows the logo briefly
- Every page has its own address (`#/stocks/NVDA`), so the browser's back button and links work
- Motion follows Emil Kowalski's design-engineering rules (skills in `.agents/skills`): short strong curves, press feedback, a sliding pill on segmented controls, fade-up page changes, reduced motion respected

## Scoring

**Universe:** a fixed list of about 100 large US stocks (S&P 100, `scripts/signals/universe.mjs`) is scored every run, plus up to 30 stocks surfaced by Congress trades, contracts or lobbying. Every stock is ranked the same way, so the list is not driven by what is in the news. WallStreetBets no longer adds stocks.

Each signal is scaled to −100…+100, then weighted. Missing data counts as neutral, so a stock needs several sources agreeing to score high. The weights follow what research finds predictive.

| Signal | Weight | What counts | Research |
|---|---|---|---|
| Chart | 45% | 12 month momentum skipping the last month and closeness to the 52 week high, both ranked against all stocks (percentiles), plus the 200 day trend and a penalty above RSI 80 | Jegadeesh & Titman (momentum), George & Hwang (52 week high) |
| Insiders | 25% | Open-market Form 4 trades. Opportunistic (unusual) buys count most, routine trades that repeat in the same month every year are ignored, 3+ buyers at once add a bonus | Cohen, Malloy & Pomorski |
| Congress | 10% | Party leaders count fully, other members only a little; by disclosure date (21 day half-life) | Leaders beat the market, rank-and-file members do not |
| WSB buzz | 10% | Only a risk: a mention spike or top 10 rank lowers the score, it never raises it | Heavy retail attention comes before weaker returns |
| Gov contracts | 5% | Awards in the last 30 days relative to market cap | Announcement effect, mostly for smaller firms |
| Lobbying | 5% | Change in spend vs the same period last year, per company (lda.gov, refreshed weekly) | Change says more than level |

Ratings: **68+ Strong buy**, **58+ Buy**, **45+ Watch**, below that **Avoid**. When the S&P 500 is below its 200 day average (risk-off) every score drops 5 points.

Tuning lives in `scripts/signals/score.mjs`.

## Position plan (when to buy, when to sell)

Every stock gets a mechanical swing-trade plan (`scripts/signals/plan.mjs`), shown as a card and as lines on the chart:

| Action | When | How to enter |
|---|---|---|
| **Buy now** | Above the 50 day average, not overbought, beating the S&P 500, rated Buy or better | Entry zone around the current price |
| **Buy on a dip** | Stretched (RSI above 70 or far above the 20 day average), only rated Watch, lagging the S&P 500, or a weak market without a Strong buy | In the zone near the 20 day average, wait for a day that closes above the previous day's high |
| **Wait for breakout** | Below the 50 day average | Buy after a daily close above it on volume of at least 1.5x the 20 day average |
| **Don't buy** | Rated Avoid | |
| **Wait for earnings** | Any of the above with earnings within 7 days | Re-check after the report |

- **Stops use the true ATR** (average true range from daily highs and lows): just under the 20 day swing low, between 3 and 4 ATR below entry. Research on stop losses finds tight stops get hit by normal noise; the backtest compares this with tighter and trend-based stops
- **Gap rule:** if it opens below the stop, sell at the open
- **Target 1** at 2x the risk: sell half and move the stop to break-even
- **The rest trails:** a stop 3 ATR below the highest close since buying (never below entry) lets winners run. The reference target (3.5R or the 52 week high) is a sensible place to take more profit
- **Other exits:** score under 45, 30 trading days without target 1, and a warning before earnings
- **Position size** so hitting the stop costs about 1% of the account, at most 20%, halved in a risk-off market
- **Relative strength:** lagging the S&P 500 over 3 months turns a buy into buy on a dip
- **Congress trades** count by disclosure date (21 day half-life), not trade date, because they are reported up to 45 days late

## Backtest and track record

- **Backtest** (`scripts/signals/backtest.mjs`): the plan rules replayed on 2 years of daily prices for every stock, using the chart signal only (there is no history of the other signals). Shows trades, win rate, average and total R, profit factor and the worst losing streak, per buy type and per stock. R = profit divided by the risk to the stop. The momentum ranks are rebuilt for every day from the stocks of that day. The same entries are also run with a tight stop (1.5 to 3 ATR) and a trend stop (below the 50 day average), next to **random entries with the same exits** and buy-and-hold S&P 500: if the rules do not beat random entries, the signal adds little. Every trade is also compared with the S&P 500 over the same days. No costs or slippage
- **Track record** (`scripts/signals/track.mjs`): every trading day the Buy recommendations are logged with their price and checked after 1, 4 and 8 weeks against the S&P 500. The log is published as `data/track.json`, so local runs continue from the live site's history

## Hot & new (flame icon)

A separate page for stocks you may want to watch but that the ranking does not recommend. Marked as speculative.

- **Hot & volatile:** the 25 most-mentioned stocks on r/wallstreetbets with mentions vs the day before (spikes flagged), daily swing (ATR as % of price, and in dollars per 100 shares), 1 month return, volume vs average and the chart. Sort by mentions, rising mentions, volatility or today's move. If a stock is also in the ranking, its score links to the full plan
- **New listings:** IPOs from the last 5 months and the next 30 days from Finnhub's free IPO calendar, without blank-check companies (SPACs) and deals under $50M. Shows the IPO price, deal size, trading days so far, return since day 1 and the lock-up end (about 180 days after the IPO). A listing joins the normal ranking automatically after 63 trading days (about 3 months), tagged NEW
- The normal list also has a **Most volatile** sort

## Portfolio risk

- **My positions** shows open risk (dollars lost if every stop is hit), invested amount and exposure per industry (Finnhub company profile)
- Limits: all stops together at most 6% of the account, at most 2 positions or 30% of the account per industry. Logging a buy warns before you exceed them and suggests a number of shares
- After selling half, the position's stop becomes break-even and then trails 3 ATR below the highest close
- Set your account size in **Settings** (optional, stored in the browser)

## Market clock and today's chart

- **World markets** on the Overview: New York, London, Amsterdam, Frankfurt, Tokyo, Hong Kong, Shanghai and Sydney with local time, open / lunch break / closed and a live countdown to the open or close. Holidays only for New York
- **US market status** in the top bar (open, pre-market, after hours, closed, with the countdown)
- **Market clock** above the chart on the 1D range: session (pre-market, open, after hours, closed), countdown to the open or close in your local time, early closes and NYSE holidays (2026 to 2028)
- **Chart ranges:** 1D (today's 5 minute bars incl. pre-market / after-hours, previous close line, live ticks), 1W (last 5 trading days in 30 minute bars), 1M, 3M, 6M, 1Y (daily)
- **Zoom:** scroll on the chart to zoom around the cursor, drag to pan, double-click or Reset to go back; on phones pinch to zoom. The range buttons follow the zoom: pinching out goes 1D → 1W → 1M → 3M → 6M → 1Y, pinching in goes all the way back down to 1D

## My positions

Press **I bought this** under a stock's position plan to log a buy (price, optional shares, date). **Positions** shows them:

- Each open position shows live P&L, days held, a track from stop to target 2, and what the plan says now: on track, target 1 reached (sell half), target 2 reached, stop hit, signals weakened (score under 45) or the 30 day time stop
- Mark **Sold half** (the stop then moves to your buy price) or **Close position** with the sell price; closed trades show return and win rate
- Positions are stored in this browser only (`localStorage`). Use **Export** / **Import** to back them up or move them to another device
- Held stocks are added to the live price stream, so they keep a price even after they drop out of the recommendations (needs a Finnhub key)

## Setup

Requires Node.js 20+.

```bash
npm install
npm run dev
```

That one command starts everything: it opens the app, fetches the public data and scores the stocks in the background (a few minutes the first time because about 130 stocks are scored and Finnhub allows 60 calls a minute; the page fills in by itself), and refreshes the data every hour while it runs. For live prices and insider trades, copy `.env.example` to `.env.local` and put your free Finnhub key in `VITE_FINNHUB_KEY`.

All keys are free and optional, but more keys mean more signals:

| Variable | Used for | Get it |
|---|---|---|
| `FINNHUB_API_KEY` | Insider trades in the pipeline | [finnhub.io/register](https://finnhub.io/register) |
| `BARGO_API_KEY` | 1,000 instead of 100 Congress rows/day | [bargo.ai/free-apis/congress](https://www.bargo.ai/free-apis/congress) |
| `LDA_API_KEY` | Higher lobbying API limit | [lda.gov/api/register](https://lda.gov/api/register/) |
| `SEC_USER_AGENT` | Contact string the SEC asks for, e.g. `Name you@example.com` | |
| `VITE_FINNHUB_KEY` | Live prices during local dev only (see `.env.example`) | same Finnhub key |

For the live site, add the first three as **repo secrets** (Settings → Secrets and variables → Actions) and optionally `SEC_USER_AGENT` as a repo **variable**. The same Finnhub key can be pasted into the app's Settings page for live prices.

Other scripts:

| Command | Description |
|---|---|
| `npm run signals` | Rebuild the data now, without the dev server |
| `npm run test:signals` | Offline test of the pipeline with stubbed APIs (also runs in CI) |
| `npm run build` | Type-check and build into `dist/` |
| `npm run lint` | Type-check only |

## Data sources and terms

- Congress trades: [Bargo free Congress API](https://www.bargo.ai/free-apis/congress), parsed from House Clerk and Senate eFD filings. Bargo requires visible attribution and forbids redistributing raw records, so only per-ticker aggregates are published.
- Insider transactions: [Finnhub](https://finnhub.io) free tier (60 calls/min).
- Federal contracts: [USASpending.gov API](https://api.usaspending.gov) (no key).
- Lobbying: [LDA.gov API](https://lda.gov/api/) (formerly lda.senate.gov). lda.gov has answered HTTP 403 to scripted requests from some networks while a browser on the same network works, so requests send browser headers. When that happens the pipeline uses the per-ticker summary the live site publishes at `data/lobbying.json`, and waits 2 hours before asking lda.gov again.
- WSB mentions: [ApeWisdom API](https://apewisdom.io/api/) (no key).
- Daily prices: Yahoo Finance chart endpoint (unofficial, no key) with Stooq as fallback.
- Company names to tickers: [SEC company_tickers.json](https://www.sec.gov/files/company_tickers.json). Contract and lobbying matches use name matching, so subsidiaries with different legal names can be missed.

Every source is fetched independently. If one fails the others still score, and the Data sources card shows what is offline. Slow sources are cached between runs (`actions/cache`) to respect free quotas.

## Project structure

```
scripts/
  build-signals.mjs     pipeline entry point
  test-signals.mjs      offline test with fixtures
  signals/sources/      one file per data source
  signals/score.mjs     indicators, scoring, reasons and risks
src/
  data/useSignals.ts    loads signals.json
  data/useLivePrices.ts Finnhub REST snapshot + WebSocket stream
  App.tsx               page shell and hash routing (#/overview, #/stocks/NVDA, ...)
  components/           pages (Overview, Stocks, Hot & new, Positions, Performance, Settings) and parts
  styles/global.css     design tokens (light/dark), type scale, layout, motion
  ui/                   shared primitives and icons
  state/store.tsx       reducer store (theme, selection, live quotes)
```

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on push to `main`, on the schedule, and manually (Actions → Run workflow). One-time setup: Settings → Pages → Source: "GitHub Actions". The site is served at `https://kevin2029.github.io/TradingBot/`.

GitHub pauses scheduled workflows in repos with no activity for 60 days; re-enable it from the Actions tab if that happens.
