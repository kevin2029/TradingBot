# Handoff: Meridian Algo Desk — Trading Bot Dashboard

## Overview
A professional dashboard for monitoring and controlling an automated trading bot. The primary job of the screen is **confirming the bot is healthy and running**; secondary jobs are watching prices/P&L, auditing executed trades, and configuring broker connectivity and risk limits.

Two views:
1. **Dashboard** — bot control, account, system health, four asset price cards, one focused chart, trading activity log, open positions, alerts.
2. **Settings** — broker connection, execution/strategy, risk management, notifications, appearance, kill switch.

Plus a **Quick controls** slide-over drawer (a condensed subset of Settings) reachable from the header on the dashboard.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype demonstrating intended look, layout, and behavior. They are **not production code to copy directly**.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, Svelte, SwiftUI, native, etc.) using its established component library, styling approach, state management, and data layer. If no environment exists yet, choose the most appropriate framework and implement there.

All market data, trades, positions, latency, and balances in the prototype are **simulated with random walks and timers**. Replace with real broker/market-data feeds.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows, and interactions are final. Recreate pixel-perfectly using the codebase's existing primitives where they exist; use the exact token values in the Design Tokens section where they don't.

---

## Global Shell

### Theme
Two themes, light and dark, driven by a `data-theme` attribute on `<html>` and CSS custom properties. Default is dark. Switchable from the header button and from Settings → Appearance. Every color in the design is a token — no hard-coded colors except `#fff` for switch knobs and destructive-button text.

### Header (sticky, `top: 0`, `z-index: 40`)
- Background `--surface`, `border-bottom: 1px solid --border`, padding `12px 24px`, `display: flex; align-items: center; gap: 16px; flex-wrap: wrap`.
- **Logo lockup** (`margin-right: auto`): 30×30 rounded square (`radius 8px`, background `--text`) containing a 12×12 `radius 3px` square of `--surface`. Beside it: "Meridian" (15px/700, `letter-spacing: -.01em`) over "ALGO DESK v4.2" (11px, `--faint`, IBM Plex Mono, `letter-spacing: .04em`).
- **Status pill**: `padding: 5px 12px 5px 10px`, `radius 999px`, background `--inset`, `1px solid --border`. 7px dot + 12px/600 mono label. States: `ACTIVE` (green `--up`), `LIVE` (red `--down`), `INACTIVE` (grey `--faint`). Dot pulses `bp 1.8s infinite` when the bot is on.
- **View nav**: segmented control, `padding: 3px`, `gap: 3px`, background `--inset`, `1px solid --border`, `radius 9px`. Buttons 28px tall, `padding: 0 12px`, `radius 6px`, 12.5px/600. Active segment: background `--surface`, color `--text`, `box-shadow: 0 1px 3px rgba(0,0,0,.18)`. Inactive: transparent, `--muted`.
- **Theme button**: 34px tall, `padding: 0 12px`, `radius 8px`, `1px solid --border`, background `--surface`, label `DARK`/`LIGHT` in 12px mono `--muted`. Hover: `border-color: --border2`, `color: --text`.
- **Quick controls button**: 34px tall, `padding: 0 14px`, `radius 8px`, `1px solid --border`, 13px/600 `--text`. Hover background `--surface2`. Opens the drawer.

### Live banner (sticky, `top: 59px`, `z-index: 39`)
Only rendered in Live mode. Background `--downsoft`, `border-bottom: 1px solid --down`, `padding: 8px 24px`, flex + `gap: 10px`. 7px red dot pulsing `bp 1.4s infinite`; text `LIVE TRADING — REAL CAPITAL AT RISK` in 12px/700 mono, `letter-spacing: .08em`, color `--down`. Right-aligned: `Session P&L <value> · <n> orders filled` in 12px `--muted`.

### Card style (used everywhere)
`background: --surface; border: 1px solid --border; border-radius: 14px; box-shadow: --shadow;` Padding is 20px on dashboard cards, 22px on Settings sections.

### Section eyebrow label
11px/700, `letter-spacing: .1em`, color `--faint`, IBM Plex Mono, uppercase (e.g. `CONTROL`, `ACCOUNT`, `SYSTEM HEALTH`).

---

## Screen 1 — Dashboard

`<main>`: `max-width: 1560px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 20px`.

### Row 1 — three cards
`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 20px`.

**Control card** (`gap: 18px` internally)
- Header row: eyebrow `CONTROL` + right-aligned uptime `UP HH:MM:SS` (11px mono `--faint`), incrementing every second.
- **Master toggle**: 78×42 button, `radius 999px`, `padding: 3px`, `transition: background .22s ease, border-color .22s ease`. Knob 34×34 white circle, `box-shadow: 0 2px 6px rgba(0,0,0,.28)`, `transition: transform .22s cubic-bezier(.4,0,.2,1)`, `translateX(0)` → `translateX(36px)`. Track: off = `--surface2` with `1px solid --border2`; on + sandbox = `--up`; on + live = `--down`, border transparent.
- Beside it: status word at 22px/700 `letter-spacing: -.02em` in the status color, and a 12px `--muted` subtitle: "Routing orders to exchange" (live) / "Paper trading against live prices" (sandbox) / "No orders will be placed" (off).
- **Execution mode** segmented control: label `EXECUTION MODE` 11px/600 `--muted` `letter-spacing: .04em`, then a 2-column grid, `gap: 4px`, `padding: 4px`, background `--inset`, `1px solid --border`, `radius 10px`. Buttons 34px, `radius 7px`, 13px/600. Active = `--surface` + shadow; the Live segment's active text color is `--down`.

**Account card**
- Eyebrow `ACCOUNT`. Total equity at 30px/600, `letter-spacing: -.03em`, IBM Plex Mono, `line-height: 1`; caption "Total equity" 12px `--muted`.
- Two inset tiles (`background --inset`, `1px solid --border`, `radius 10px`, `padding: 10px 12px`) in a 2-col grid, `gap: 12px`, pushed down with `margin-top: auto`: "Buying power" (equity × 1.85, 0 dp) and "Day P&L" (colored green/red). Values 15px/600 mono.

**System health card**
- Eyebrow `SYSTEM HEALTH`, then four rows (`gap: 10px`): 6px status dot, 13px `--muted` label, right-aligned 13px/600 mono value in the status color.
  - Exchange API — `ONLINE` (green)
  - Market data feed — `STREAMING` (green)
  - Order latency — `<n> ms` (green; `--warn` above 55ms), re-randomized 28–62ms each tick
  - Strategy engine — `EVALUATING` (`--info`) / `PAUSED` (`--faint`)
- Footer above a `1px solid --border` top border, `padding-top: 12px`, 2-col: "Win rate" (% of trades with positive P&L) and "Profit factor" (gross win / gross loss, 2 dp). Values 18px/600 mono.

### Row 2 — four asset cards
`grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr)); gap: 16px`. Each card is a button (selects the focused chart); `padding: 16px 18px`, `gap: 12px`. Border is `--border2` when selected, `--border` otherwise; hover `--border2`.
- Title row: asset name 13px/700 + symbol chip (10px mono `--faint`, `1px solid --border`, `radius 4px`, `padding: 1px 5px`).
- Price 24px/600 mono, `letter-spacing: -.02em`.
- Change row (`gap: 6px`, `margin-top: 8px`): absolute change 12px/600 mono in gain/loss color; percentage chip 11px/600 mono on a `--upsoft`/`--downsoft` background, `radius 4px`, `padding: 1px 5px`. Uses `+`/`−` (U+2212) prefixes.
- **Sparkline**: 88×40 inline SVG, `viewBox="0 0 100 40"`, `preserveAspectRatio="none"`. Last 60 points normalized into y 4–36. Filled area path in the soft color; stroke 1.6px `vector-effect: non-scaling-stroke`, `stroke-linejoin: round`, in the gain/loss color.

Assets: Silver `XAG/USD` base 38.42, Gold `XAU/USD` base 3418.60, Crude Oil `CL=F` base 71.85, S&P 500 `SPX` base 6284.10. All 2 dp; only S&P renders without a `$` prefix.

### Row 3 — focused chart card
- Header: asset name 17px/700 + symbol 11px mono `--faint`; below, price 26px/600 mono and `change (pct)` 13px/600 mono in the gain/loss color.
- Right: range segmented control (`15M` / `1H` / `4H` / `1D`), 28px buttons, 12px/600 mono, same active treatment as other segmented controls. Window sizes: 45 / 90 / 140 / 181 points.
- **Canvas chart**, wrapper `position: relative; width: 100%; height: 320px`; canvas fills it, `cursor: crosshair`, sized by `devicePixelRatio`.
  - Insets: left 8, right 62, top 14, bottom 26. Y domain padded 12% each side.
  - 5 horizontal gridlines in `--grid`, right-hand price labels 11px mono `--faint`.
  - 5 x-axis time labels (`HH:MM`), centered, clamped inside the plot.
  - Area fill: vertical gradient from line color at 22% alpha to 0.
  - Line: 1.8px, `lineJoin: round`, green if last ≥ first else red.
  - Last price: dashed `[3,4]` horizontal rule at 50% alpha + 3.5px filled dot.
  - **Crosshair on hover**: vertical gridline-colored rule, 4.5px ring (surface fill, 2px line-colored stroke) on the nearest point, and a rounded 6px tooltip pill at the top of the plot (`--surface` fill, `--grid` border) reading `$<price>   HH:MM:SS` in 11px mono `--text`. Cleared on mouse leave.
  - The canvas reads its colors from `getComputedStyle(document.documentElement)` at draw time so it repaints correctly on theme change; it also redraws on window resize.

### Row 4 — activity + positions/alerts
`grid-template-columns: repeat(auto-fit, minmax(min(540px, 100%), 1fr)); gap: 20px; align-items: start`. The `min(…, 100%)` guard is required — a bare `minmax(540px, 1fr)` overflows on phones.

**Trading activity** (left)
- Header `padding: 16px 20px`, `border-bottom: 1px solid --border`: title 14px/700 + two `<select>` filters (asset: All/Silver/Gold/Oil/S&P; type: All/Buy/Sell). Selects: 30px tall, `radius 7px`, `1px solid --border`, background `--inset`, 12px.
- Column grid (header and rows share it): `68px minmax(0, 1fr) 48px 78px 86px; gap: 6px`. Header row: `padding: 9px 20px`, background `--inset`, 10px/700 mono `letter-spacing: .08em` `--faint`: `TIME · ASSET · QTY · PRICE · P&L` (last three right-aligned).
- Rows: `padding: 11px 20px`, `border-bottom: 1px solid --border`, 12.5px mono. Time `--muted`; asset cell = BUY/SELL badge (10px/700, `radius 4px`, `padding: 1px 5px`, soft green/red background) + name (600, ellipsized); qty `--muted`; price `--text`; P&L 600 in green/red with `+`/`−`.
- Scroll container `max-height: 396px; overflow-y: auto`. New rows animate in with `slidein .3s ease`.

**Open positions** (right, top)
- Header: title 14px/700 + count chip (11px mono, `--inset`, `radius 999px`, `padding: 1px 8px`) + right-aligned total unrealized P&L 12px/600 mono in green/red.
- Column grid `minmax(0, 1fr) 46px 74px 74px 86px; gap: 6px`; header labels `POSITION · QTY · ENTRY · MARK · UNREAL.`
- Rows `padding: 12px 20px`. Position cell = LONG/SHORT badge + name. Unrealized P&L = `(mark − entry) × qty × multiplier`, sign-flipped for shorts; S&P uses a 10× contract multiplier.
- Seed positions: LONG 4 Gold @ 3402.15, SHORT 20 Crude Oil @ 72.94, LONG 2 S&P 500 @ 6251.80, LONG 150 Silver @ 37.88.

**Alerts** (right, bottom)
- Header `padding: 16px 20px`, 14px/700. Rows `padding: 13px 20px`, `gap: 12px`, `border-bottom: 1px solid --border`, `max-height: 240px; overflow-y: auto`.
- Each row: 6px severity dot (`margin-top: 6px`), message 13px `line-height: 1.45`, then `HH:MM:SS · KIND` in 11px mono `--faint`. Kinds: `SYSTEM` (info), `RISK` (warn), `FEED` (warn), `SIGNAL` (up), `FILL` (info). New alerts animate `slidein .3s ease`.

---

## Screen 2 — Settings

`<main>`: `max-width: 980px; margin: 0 auto; padding: 32px 24px; gap: 24px`. Page title 26px/700 `letter-spacing: -.025em` + 14px `--muted` subtitle "Broker connectivity, execution, risk and account preferences."

Every field grid uses `repeat(auto-fit, minmax(min(260px, 100%), 1fr))` (240px in Execution, 280px in Risk). Field labels 12.5px/600; inputs and selects 38px tall, `radius 8px`, `1px solid --border`, background `--inset`, 13px, `margin: 0`, `width: 100%`; credential/ID inputs use IBM Plex Mono.

### Broker connection
- Card header (`padding: 18px 22px`, bottom border): title 15px/700 + 12.5px `--muted` "Credentials are encrypted at rest and never leave your account." Right: **status pill** — `padding: 5px 12px 5px 10px`, `radius 999px`, tinted background, 7px dot, 11.5px/700 mono label.
  - `CONNECTED` — `--up` on `--upsoft`, dot pulses `bp 2.4s`
  - `HANDSHAKING` — `--warn` on `--warnsoft`, dot pulses `bp 1s`
  - `DISCONNECTED` — `--faint`, transparent background, no pulse
- Fields (`padding: 22px`, `gap: 18px`): **Broker** (Interactive Brokers / Alpaca Markets / OANDA / Tradovate / Binance / Custom FIX or REST endpoint), **Environment** (Paper-demo / Production), **Account ID**, **API endpoint**, **API key**, **API secret**. The secret field is `type="password"` with a "Reveal"/"Hide" text button (11.5px/600 `--info`) in its label row.
- Footer bar (`padding: 16px 22px`, top border, background `--inset`): status detail line in 12px mono `--muted` — connected shows `<Broker> · PAPER|PRODUCTION · last handshake HH:MM:SS · 4 instruments subscribed`. Buttons right-aligned, 36px, `radius 9px`: **Disconnect** (outlined, `--muted`, hover turns `--down`) and **Test connection** (solid `--info`, white text; shows "Testing…" for 1600ms then resolves to CONNECTED).
- Changing the broker resets the connection to `disconnected`.

### Execution
Mode segmented control (max-width 360px) + helper text that swaps with the mode. Four selects: **Signal source** (MA crossover 12/48 · RSI mean reversion · Bollinger breakout), **Evaluation interval** (1m/5m/15m/1h), **Order type** (Market · Limit mid+offset · TWAP over 5 min), **Base currency** (USD/EUR/GBP). Then three switch rows: **Trailing stop**, **Restrict to session hours** (09:30–16:00 ET), **Allow hedged positions**.

**Switch row pattern**: `padding: 12px 0`, `border-top: 1px solid --border`; label 13px/500 over 11.5px `--faint` hint; switch pushed right — 44×25, `radius 999px`, `padding: 2px`, knob 19×19 white, `translateX(0)` → `translateX(19px)`, `transition: all .2s`. On = `--info`, border transparent; off = `--surface2`, `1px solid --border2`.

### Risk management
Five sliders (`accent-color: --info`), each: label 13px/500 + right-aligned value 13px/600 mono `--info`, the range input, then an 11.5px `--faint` hint.

| Setting | Min | Max | Step | Default | Unit | Hint |
|---|---|---|---|---|---|---|
| Max position size | 1 | 25 | 0.5 | 8 | % equity | Cap on capital allocated to any single position. |
| Daily loss limit | 0.5 | 10 | 0.5 | 2.5 | % | Bot halts and flattens all positions when breached. |
| Stop loss | 0.25 | 8 | 0.25 | 1.5 | % | Per-trade protective exit. |
| Take profit | 0.5 | 15 | 0.5 | 3.5 | % | Per-trade target exit. |
| Max concurrent positions | 1 | 12 | 1 | 4 | — | Total simultaneous open positions across all assets. |

Range inputs need an explicit `margin: 0` — the UA default margin overflows the container.

### Notifications
Webhook URL text field (max-width 420px) + three switch rows: **Order fills**, **Risk breaches**, **Daily performance digest**.

### Appearance
Light / Dark segmented control (max-width 360px), same pattern as the mode selector.

### Emergency kill switch
Card with `border: 1px solid --down`. Title 15px/700 in `--down`, 12.5px `--muted` description. Right-aligned solid `--down` button, 38px, `radius 9px`, 13px/700, white text: "Flatten & halt". Action: bot off, mode → sandbox, and a `SYSTEM` alert prepended: "Kill switch engaged — engine halted, working orders cancelled, positions flattened."

---

## Quick controls drawer
Fixed right slide-over, `z-index: 51`, `width: min(440px, 100%)`, full height, `background --surface`, `border-left: 1px solid --border`, `box-shadow: -20px 0 60px rgba(0,0,0,.22)`. Animates with `transform: translateX(103%) → translateX(0)`, `transition: transform .3s cubic-bezier(.4,0,.2,1)`. Scrim: fixed inset 0, `z-index: 50`, `rgba(6,10,15,.5)`, `backdrop-filter: blur(2px)`, opacity 0→1 over `.25s`, `pointer-events` toggled. Header 18px/22px with a 30×30 close button. Body `padding: 22px; gap: 26px`, scrollable: Execution mode + helper, Risk sliders, Strategy params + switches, Appearance. Opening the Settings page closes the drawer.

## Live-mode confirmation modal
Fixed inset 0, `z-index: 60`, `rgba(6,10,15,.6)` + `blur(3px)`, centered, `padding: 24px`. Panel `width: min(440px, 100%)`, `radius 16px`, `padding: 26px`, `box-shadow: 0 30px 80px rgba(0,0,0,.4)`, `animation: slidein .18s ease`.
- Eyebrow: 8px red dot + `SWITCH TO LIVE TRADING` in 11px/700 mono `letter-spacing: .1em` `--down`.
- Body 15px `line-height: 1.55`: "Orders will be routed to the exchange and executed with real capital."
- Secondary 13px `--muted`: "Current limits: 8% max size · 2.5% daily loss limit · 4 concurrent positions" (interpolated from live risk values).
- Buttons right-aligned, 38px, `radius 9px`: **Stay in Sandbox** (outlined) and **Enable live trading** (solid `--down`, white). Live mode is only reachable through this dialog — the segmented Live button opens it rather than switching directly.

---

## Interactions & Behavior

| Trigger | Behavior |
|---|---|
| Master toggle | Flips bot on/off. Off stops trade generation and sets Strategy engine to `PAUSED`. |
| Live segment (anywhere) | Opens the confirmation modal; never switches directly. |
| Sandbox segment | Switches immediately, no confirmation. |
| Theme button / Appearance | Sets `document.documentElement.dataset.theme`; the canvas re-reads tokens and repaints. |
| Asset card click | Sets the focused asset for the large chart and clears the crosshair. |
| Range segment | Changes the visible window and clears the crosshair. |
| Chart mousemove | `hover = clientX − rect.left`; nearest index resolved during draw. Mouseleave clears. |
| Log filters | Filter by asset key and side; the list renders the first 40 matches. |
| Test connection | 1600ms `HANDSHAKING` state, then `CONNECTED`. |
| Broker change | Resets connection to `DISCONNECTED`. |
| Kill switch | Bot off, mode → sandbox, `SYSTEM` alert prepended. |

**Simulation loop (prototype only, replace with real feeds):** a 1400ms interval mean-reverting random walk per asset (`next = last + rnd(vol × 0.4) + (base − last) × 0.008`), a new trade every 3rd tick when the bot is on, a new alert every 17th tick, latency re-randomized each tick, and a separate 1s interval for uptime. History is 181 points spaced 20s apart.

**Trade record:** timestamp, asset, side (52% BUY), quantity (Silver 50–150, Oil 5–20, others 1–4), price = last ± 0.06%, P&L = 63% win rate, magnitude $40–$760. Log capped at 60 records.

## State Management

```
theme            'dark' | 'light'
mode             'sandbox' | 'live'
botOn            boolean
view             'dashboard' | 'settings'
settingsOpen     boolean        // drawer
confirmOpen      boolean        // live-mode modal
focus            asset key      // 'XAG' | 'XAU' | 'CL' | 'SPX'
range            '15M' | '1H' | '4H' | '1D'
hover            number | null  // crosshair x in px
series           { [key]: { open: number, pts: {t,p}[] } }
trades           Trade[]        // capped at 60
positions        Position[]
alerts           Alert[]        // capped at 20
filterAsset      'all' | asset key
filterSide       'all' | 'BUY' | 'SELL'
strategy         'ma' | 'rsi' | 'bb'
interval         '1m' | '5m' | '15m' | '1h'
orderType        'market' | 'limit' | 'twap'
currency         'USD' | 'EUR' | 'GBP'
risk             { size, loss, stop, take, concurrent }
toggles          { trailing, hours, hedge }
notifs           { fills, risk, digest }
broker           'ibkr' | 'alpaca' | 'oanda' | 'tradovate' | 'binance' | 'custom'
brokerEnv        'paper' | 'prod'
accountId, endpoint, apiKey, apiSecret, webhook   string
showSecret       boolean
conn             'connected' | 'testing' | 'disconnected'
latency, uptime  number
equityBase       number
```

**Derived:** day P&L = realized (sum of trade P&L) + unrealized (sum of position P&L); equity = base + day P&L; buying power = equity × 1.85; win rate = winning trades / total; profit factor = gross wins / gross losses.

**Data fetching for a real implementation:** streaming quotes for the four instruments (websocket), historical bars per range, order/fill stream, positions snapshot + updates, account balances, and broker credential storage (server-side, encrypted; never expose secrets to the client).

## Design Tokens

### Light (`:root`)
```
--bg #f4f6f8   --surface #ffffff  --surface2 #eef1f5  --inset #f8fafb
--text #0f151c --muted #64748b    --faint #94a3b8
--border #e2e7ee  --border2 #cfd7e2
--up #14855a   --upsoft rgba(20,133,90,.10)
--down #cf2f3d --downsoft rgba(207,47,61,.10)
--info #2563eb --infosoft rgba(37,99,235,.10)
--warn #b45309 --warnsoft rgba(180,83,9,.10)
--grid rgba(15,23,42,.07)
--shadow 0 1px 2px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.05)
```

### Dark (`html[data-theme="dark"]`)
```
--bg #0b0f14   --surface #131a22  --surface2 #1a232e  --inset #0f151c
--text #e7edf5 --muted #8fa0b3    --faint #64748b
--border #222d3a  --border2 #2e3b4b
--up #34d399   --upsoft rgba(52,211,153,.12)
--down #f87171 --downsoft rgba(248,113,113,.12)
--info #60a5fa --infosoft rgba(96,165,250,.12)
--warn #fbbf24 --warnsoft rgba(251,191,36,.12)
--grid rgba(231,237,245,.08)
--shadow 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.28)
```

### Typography
- **IBM Plex Sans** 400/500/600/700 — UI text.
- **IBM Plex Mono** 400/500/600 — all numerics, timestamps, symbols, status labels, eyebrows.
- Scale: 26 (page title) · 30 (equity) · 24/26 (prices) · 22 (bot status) · 18 (stat) · 17/15/14 (headings) · 13/12.5 (body) · 12/11.5 (meta) · 11/10 (eyebrows, badges).
- Negative tracking on large text (`-.01em` to `-.03em`); positive on mono eyebrows/labels (`.04em`–`.1em`).

### Spacing, radii, motion
- Spacing: 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 32.
- Radii: 4 (chips) · 6/7 (segments) · 8/9 (buttons, inputs) · 10 (tiles, segment tracks) · 14 (cards) · 16 (modal) · 999 (pills, switches).
- Motion: `.15s` hovers · `.2s` small switches · `.22s cubic-bezier(.4,0,.2,1)` master toggle · `.25s` scrim · `.3s cubic-bezier(.4,0,.2,1)` drawer · `slidein .3s ease` for new rows · `bp` opacity pulse (1s/1.4s/1.8s/2.4s) for status dots.
- Custom scrollbars: 10px, thumb `--border2` with a 3px transparent border and `background-clip: content-box`, transparent track.

### Responsive
No media queries — every grid uses `repeat(auto-fit, minmax(min(<floor>, 100%), 1fr))`. The `min(…, 100%)` guard is what allows single-column collapse on phones. Floors: 300px (row 1), 230px (asset cards), 540px (activity/positions), 260/240/280px (settings field grids). The header wraps with `flex-wrap: wrap`. Verified at 390px, 924px, 1200px, 1600px.

## Assets
None. No image or icon files — the logo is two nested CSS squares, status indicators are CSS circles, and the sparklines/chart are generated from data (SVG paths and canvas). Fonts load from Google Fonts. If your codebase has an icon set and brand mark, substitute them.

## Files
- `Trading Bot Dashboard.dc.html` — the complete prototype (both views, drawer, modal, simulation).
- `support.js` — the prototype's runtime; **not** part of the design, and not needed in the target codebase.

Open the HTML file directly in a browser to interact with the prototype.
