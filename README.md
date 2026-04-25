# AlphaTest — 美股策略回測平台

A modern stock strategy backtesting platform built with React 19, TypeScript, tRPC, and Drizzle ORM.

## Features

- **4 Built-in Strategies**: MA Crossover, RSI Overbought/Oversold, MACD, Bollinger Bands
- **Custom Parameters**: Adjust strategy parameters via sliders
- **Yahoo Finance Data**: Free real-time US stock data via `yahoo-finance2`
- **TradingView Widget**: Embedded K-line chart
- **Performance Metrics**: Annualized return, max drawdown, Sharpe ratio, win rate, total trades
- **Equity Curve**: Interactive area chart with Recharts
- **History & Compare**: Save results and compare multiple backtests side-by-side

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Recharts, TradingView Widget |
| Backend | Node.js, Express, tRPC 11 |
| Database | MySQL / TiDB (Drizzle ORM) |
| Data Source | Yahoo Finance (yahoo-finance2 v3) |
| Auth | Manus OAuth |

## Deploy on Render

### Prerequisites

1. A MySQL-compatible database (e.g., [PlanetScale](https://planetscale.com), [TiDB Cloud](https://tidbcloud.com), or Render's own MySQL add-on)
2. A GitHub account with this repository

### Steps

1. Go to [render.com](https://render.com) and click **New → Web Service**
2. Connect your GitHub account and select the `stock-backtest` repository
3. Render will auto-detect `render.yaml` — confirm the settings
4. Set the following **Environment Variables** in the Render dashboard:

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string (e.g., `mysql://user:pass@host:3306/dbname`) |
| `JWT_SECRET` | Random secret for session signing (auto-generated if using render.yaml) |
| `VITE_APP_ID` | Manus OAuth App ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `OWNER_OPEN_ID` | Owner's Manus Open ID |
| `OWNER_NAME` | Owner's display name |

5. Click **Deploy** — Render will run `pnpm install && pnpm run build` then start with `pnpm run start`

### Database Migration

After first deploy, run the migration SQL from `drizzle/` directory against your database to create the required tables.

## Local Development

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Start dev server
pnpm run dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm run dev` | Start development server with hot reload |
| `pnpm run build` | Build for production |
| `pnpm run start` | Start production server |
| `pnpm run test` | Run vitest tests |
