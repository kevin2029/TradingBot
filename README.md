# Meridian Signal Desk

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
- **Live prices** come from Finnhub's free WebSocket (real-time US trades, up to 50 symbols). Each visitor pastes their own free key in Settings; it stays in their browser.
- The disclosures themselves are not real-time by law: Congress members have up to 45 days to report a trade, insiders 2 business days. Checking hourly is plenty.

## Scoring

Each signal is scaled to −100…+100, then weighted. Missing data counts as neutral, so a stock needs several sources agreeing to score high.

| Signal | Weight | What counts |
|---|---|---|
| Chart | 30% | Price vs 50 and 200 day averages, 20 day momentum, RSI (overbought is penalised) |
| Congress | 20% | Purchases minus sales, weighted by amount and recency (30 day half-life), last 90 days |
| Insiders | 20% | Open-market buys (Form 4 code P) count far more than sales, last 90 days |
| Gov contracts | 10% | Federal contract awards in the last 30 days |
| Lobbying | 10% | Lobbying spend disclosed in the last 90 days (weak signal, capped) |
| WSB buzz | 10% | Rank and 24 hour mention change; a 3x spike is flagged as a volatility risk |

Ratings: **68+ Strong buy**, **58+ Buy**, **45+ Watch**, below that **Avoid**. When the S&P 500 is below its 200 day average (risk-off) every score drops 5 points.

Tuning lives in `scripts/signals/score.mjs`.

## Setup

Requires Node.js 20+.

```bash
npm install
npm run signals     # fetch data and write public/data/signals.json
npm run dev         # http://localhost:5173/TradingBot/
```

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
| `npm run test:signals` | Offline test of the pipeline with stubbed APIs (also runs in CI) |
| `npm run build` | Type-check and build into `dist/` |
| `npm run lint` | Type-check only |

## Data sources and terms

- Congress trades: [Bargo free Congress API](https://www.bargo.ai/free-apis/congress), parsed from House Clerk and Senate eFD filings. Bargo requires visible attribution and forbids redistributing raw records, so only per-ticker aggregates are published.
- Insider transactions: [Finnhub](https://finnhub.io) free tier (60 calls/min).
- Federal contracts: [USASpending.gov API](https://api.usaspending.gov) (no key).
- Lobbying: [LDA.gov API](https://lda.gov/api/) (formerly lda.senate.gov).
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
  components/           market pulse, recommendation list, stock detail, chart, settings
  state/store.tsx       reducer store (theme, selection, live quotes)
```

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on push to `main`, on the schedule, and manually (Actions → Run workflow). One-time setup: Settings → Pages → Source: "GitHub Actions". The site is served at `https://kevin2029.github.io/TradingBot/`.

GitHub pauses scheduled workflows in repos with no activity for 60 days; re-enable it from the Actions tab if that happens.
