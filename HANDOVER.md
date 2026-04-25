# AlphaTest — Manus Agent Handover Document

> **Purpose:** This document is written for the next Manus agent session to continue development of the AlphaTest stock backtesting platform without losing context.

---

## 1. Project Overview

**AlphaTest** is a US stock strategy backtesting web application. Users can input any US stock ticker, choose from 4 built-in technical indicator strategies, customize parameters, and run backtests powered by Yahoo Finance free data. Results include 5 performance metrics, an equity curve chart, and a TradingView K-line widget.

**Live preview (Manus hosted):** `stockbacktest-fauym4rz.manus.space`

**GitHub repo (private):** `https://github.com/jacklungcmbinary-cell/stock-backtest`

**Manus project name:** `stock-backtest`

**Project path in sandbox:** `/home/ubuntu/stock-backtest`

**Latest checkpoint version:** `7c1e1b3d`

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Recharts, TradingView Widget, shadcn/ui |
| Backend | Node.js, Express, tRPC 11, Drizzle ORM |
| Auth | Local JWT — email/password (bcryptjs + jose). **No Manus OAuth.** |
| Database | MySQL / TiDB (Drizzle ORM) |
| Stock Data | Yahoo Finance via `yahoo-finance2` v3 Node.js package |
| Testing | Vitest (5 tests, all passing) |

---

## 3. Current Features (Completed)

The following features are fully implemented and working:

- **4 backtest strategies:** MA Crossover, RSI Overbought/Oversold, MACD, Bollinger Bands
- **Custom parameters** via sliders for each strategy
- **Yahoo Finance data** fetched server-side via `yahoo-finance2`
- **5 performance metrics:** Annualized Return, Max Drawdown, Sharpe Ratio, Win Rate, Total Trades
- **Equity curve chart** (Recharts AreaChart)
- **TradingView Widget** embedded K-line chart
- **Save backtest results** to MySQL database (requires login)
- **History page** — view and delete saved results
- **Compare page** — side-by-side comparison of multiple backtest results
- **Local JWT auth** — `/login` page with email/password register + sign in
- **Isometric geometric visual design** — teal/coral/blue floating shapes, grid background

---

## 4. Pending Features (Next Tasks)

The owner wants to add **Poe AI integration**. Here is exactly what needs to be built:

### Feature A: AI Model Selector
- A dropdown on the AI Advisor page letting users choose which AI model to use (e.g. Claude 3.5 Sonnet, GPT-4o, Gemini, etc.)
- The selected model is sent with every AI request

### Feature B: AI Goal Advisor (Main Feature)
- A new page `/ai-advisor` with a natural language input form
- User inputs their investment goal in plain language, e.g.:
  > "I'm 35 years old, want 15% annual return, moderate risk tolerance, investment horizon 5 years"
- AI parses the input and returns:
  1. Recommended stock portfolio (3–5 tickers with rationale)
  2. Recommended strategy for each stock
  3. Suggested parameter settings
- System then **automatically runs backtests** for all recommended combinations
- Results are displayed in a comparison table

### Feature C: AI Assistant Chat Widget
- A floating chat button (bottom-right corner) visible on all pages
- Opens a chat panel where users can ask questions like:
  > "What does Sharpe ratio mean?" / "Which strategy is better for volatile stocks?"
- AI answers in context of the current page / backtest result

---

## 5. Poe API Key

The owner has a paid Poe subscription. The API key has been set as environment variable `POE_API_KEY`:

```
sk-poe-d-Gc4dpSKDWNHXzmG_yQPTTMe-hH1mKHrWtcoJXYMKQ
```

**Important notes on Poe API:**
- The correct way to call Poe API is via the `fastapi-poe` Python package **or** via the HTTP streaming endpoint
- The HTTP endpoint format is: `POST https://api.poe.com/bot/{bot_name}` with SSE streaming
- Bot names to support: `Claude-3-5-Sonnet`, `GPT-4o`, `Gemini-1.5-Pro`, `Claude-3-Opus`
- The API returns **Server-Sent Events (SSE)** — you need to handle streaming responses
- Recommended approach: use `fetch` with `ReadableStream` on the server side, or install `fastapi-poe` npm equivalent

**Suggested implementation approach:**
1. Install `eventsource-parser` npm package for SSE parsing
2. Build `server/poe.ts` — a wrapper that calls Poe API and returns full text response
3. Add tRPC procedures: `ai.analyzeGoal`, `ai.chat`
4. Build frontend pages and components

---

## 6. Database Schema

Two tables exist in MySQL:

### `users` table
```sql
CREATE TABLE `users` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `email` varchar(320) NOT NULL UNIQUE,
  `passwordHash` varchar(255) NOT NULL DEFAULT '',
  `name` varchar(100),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  `lastSignedIn` timestamp NOT NULL DEFAULT NOW()
);
```

### `backtest_results` table
```sql
CREATE TABLE `backtest_results` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `ticker` varchar(20) NOT NULL,
  `strategy` varchar(50) NOT NULL,
  `strategyParams` json NOT NULL,
  `startDate` varchar(20) NOT NULL,
  `endDate` varchar(20) NOT NULL,
  `annualizedReturn` float,
  `maxDrawdown` float,
  `sharpeRatio` float,
  `winRate` float,
  `totalTrades` int,
  `equityCurve` json,
  `trades` json,
  `createdAt` timestamp NOT NULL DEFAULT NOW()
);
```

---

## 7. Key File Structure

```
/home/ubuntu/stock-backtest/
├── client/src/
│   ├── pages/
│   │   ├── Home.tsx          ← Landing page (isometric design)
│   │   ├── Backtest.tsx      ← Main backtest page
│   │   ├── History.tsx       ← Saved results list
│   │   ├── Compare.tsx       ← Side-by-side comparison
│   │   └── Login.tsx         ← Email/password auth page
│   ├── _core/hooks/
│   │   └── useAuth.ts        ← Local JWT auth hook (calls /api/auth/me)
│   ├── App.tsx               ← Routes: /, /backtest, /history, /compare, /login
│   ├── const.ts              ← getLoginUrl() returns /login (NOT Manus OAuth)
│   └── index.css             ← Global theme: white bg, grid texture, teal/coral/blue
├── server/
│   ├── backtest.ts           ← TypeScript backtest engine (yahoo-finance2)
│   ├── db.ts                 ← Drizzle DB query helpers
│   ├── routers.ts            ← tRPC procedures (backtest.run, backtest.save, etc.)
│   ├── backtest.test.ts      ← Vitest tests (4 tests)
│   ├── auth.logout.test.ts   ← Vitest tests (1 test)
│   └── _core/
│       ├── localAuth.ts      ← Express routes: POST /api/auth/register|login|logout, GET /api/auth/me
│       ├── context.ts        ← tRPC context: verifies JWT cookie locally
│       ├── index.ts          ← Express server entry: registers localAuth routes
│       └── env.ts            ← Environment variable definitions
├── drizzle/
│   ├── schema.ts             ← Drizzle schema (users + backtest_results)
│   ├── 0000_*.sql            ← Migration: create users table
│   ├── 0001_*.sql            ← Migration: create backtest_results table
│   └── 0002_massive_wither.sql ← Migration: update users (add passwordHash, remove openId)
├── render.yaml               ← Render deployment config (only needs DATABASE_URL + JWT_SECRET)
├── README.md                 ← Full deployment guide
└── todo.md                   ← Feature tracking
```

---

## 8. Auth System

**All Manus OAuth has been removed.** The auth system is now fully local:

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Create account: `{ email, password, name? }` → sets session cookie |
| `/api/auth/login` | POST | Sign in: `{ email, password }` → sets session cookie |
| `/api/auth/logout` | POST | Clears session cookie |
| `/api/auth/me` | GET | Returns current user from cookie, or `null` |

Session is a **JWT stored in an httpOnly cookie** (`app_session`). The `useAuth()` hook in the frontend calls `/api/auth/me` on mount.

---

## 9. Deployment (Render)

Only **2 environment variables** are needed:

| Variable | Value |
|---|---|
| `DATABASE_URL` | MySQL connection string (e.g. PlanetScale, TiDB Cloud) |
| `JWT_SECRET` | Auto-generated by render.yaml |

Build command: `pnpm install && pnpm run build`
Start command: `pnpm run start`

After first deploy, run the 3 migration SQL files in order against the database.

---

## 10. Known Issues / Notes

- `server/_core/storageProxy.ts` has a pre-existing TypeScript error (framework file, do NOT edit — it does not affect runtime)
- The `server/_core/sdk.ts` and `server/_core/oauth.ts` files still exist but are stubbed out (no-ops). They can be safely ignored or deleted if they cause confusion.
- `POE_API_KEY` is already set as environment variable in the Manus project secrets. When implementing Poe API, read it from `process.env.POE_API_KEY`.
- The Poe API uses **SSE streaming** — test with a simple fetch before building the full integration.

---

*Document written by Manus agent on 2026-04-25. Checkpoint version: `7c1e1b3d`.*
