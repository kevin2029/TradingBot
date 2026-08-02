# Meridian Algo Desk

A professional trading bot dashboard: control the bot, watch live prices for Silver, Gold, Crude Oil, and the S&P 500, review trading activity and open positions, and configure broker/risk settings — all in a responsive, light/dark-themed interface.

Built from the design handoff in [`design_handoff_trading_bot_dashboard/`](design_handoff_trading_bot_dashboard/README.md).

## Features

- **Bot control** — master on/off toggle, Sandbox vs. Live execution mode (Live is gated behind a confirmation modal), live uptime and system health status
- **Account overview** — equity, buying power, day P&L
- **Live asset cards** — Silver, Gold, Crude Oil, S&P 500 with price, change, % change, and sparklines
- **Focused price chart** — hand-drawn canvas chart with gridlines, area fill, and a hover crosshair/tooltip, switchable across 15M/1H/4H/1D ranges
- **Trading activity log** — filterable by asset and buy/sell side
- **Open positions** and **alerts feed**
- **Settings** — broker connection (with a simulated test-connection flow), execution/strategy parameters, risk management sliders, notifications, appearance, and an emergency kill switch
- **Quick controls drawer** and **light/dark theming**, fully responsive from mobile to desktop

## Tech stack

React 18 + TypeScript + Vite. No UI framework or charting library — components are hand-built to match the design tokens exactly, and the price chart is drawn directly on `<canvas>`.

## Getting started

Requires [Node.js](https://nodejs.org) (LTS).

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

Other scripts:

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check only (`tsc --noEmit`) |

## Project structure

```
src/
  components/       Dashboard cards, chart, activity log, positions, alerts
  components/settings/  Broker, execution, risk, notifications, appearance, kill switch
  ui/               Shared primitives (Card, SegmentedControl, Switch, StatusPill, ...)
  state/            Global reducer store + derived selectors (equity, P&L, win rate, ...)
  data/             Asset definitions + market feed adapter
  utils/            Formatting, canvas drawing, and status helpers
  styles/           Design tokens and global CSS
```

## Data layer

All market data, trades, positions, and alerts are currently **simulated** (a mean-reverting random walk — see `src/data/simulationAdapter.ts`). The simulation runs behind a `MarketFeedAdapter` interface (`src/data/adapter.ts`), so wiring up a real broker later — e.g. [OANDA](https://developer.oanda.com/rest-live-v20/introduction/)'s free practice API, which covers all four instruments (`XAG_USD`, `XAU_USD`, `WTICO_USD`, `SPX500_USD`) — means writing one new adapter that implements the same interface, with no changes needed to components or state.

## Deployment

Pushes to `main` automatically build and deploy to **GitHub Pages** via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). One-time setup: in the repo's **Settings → Pages**, set **Source** to "GitHub Actions". After that, the live site is available at `https://kevin2029.github.io/TradingBot/`.

## Design system

Light and dark themes are driven by CSS custom properties on `<html data-theme>`, defined in `src/styles/global.css`. See the [design handoff README](design_handoff_trading_bot_dashboard/README.md) for the full token reference, typography scale, and interaction spec this implementation follows.
