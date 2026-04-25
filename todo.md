# Stock Backtest Platform - TODO

## Phase 1: Database Schema & Project Setup
- [x] Initialize project with web-db-user scaffold
- [x] Design and migrate backtest_results table in drizzle/schema.ts
- [x] Add DB query helpers in server/db.ts

## Phase 2: Python Backtest Engine
- [x] Install yfinance, pandas, numpy, scipy on server
- [x] Create server/backtest_engine.py with Yahoo Finance data fetching
- [x] Implement MA Crossover strategy
- [x] Implement RSI Overbought/Oversold strategy
- [x] Implement MACD strategy
- [x] Implement Bollinger Bands strategy
- [x] Calculate performance metrics: annualized return, max drawdown, Sharpe ratio, win rate, trade count
- [x] Expose backtest engine via child_process from Node.js

## Phase 3: tRPC Backend Routes
- [x] Add backtest.run procedure (calls Python engine, saves result to DB)
- [x] Add backtest.save procedure
- [x] Add backtest.list procedure (fetch saved results for current user)
- [x] Add backtest.delete procedure
- [x] Add backtest.getById procedure

## Phase 4: Frontend - Visual Design & Layout
- [x] Set up light theme with teal/blue/coral color palette in index.css
- [x] Add Space Grotesk + JetBrains Mono fonts via Google Fonts
- [x] Build isometric geometric hero section on homepage
- [x] Register all routes in App.tsx (Home, Backtest, History, Compare)

## Phase 5: Backtest Configuration Panel
- [x] Stock ticker input with validation
- [x] Strategy selector (MA, RSI, MACD, Bollinger Bands)
- [x] Dynamic strategy parameter inputs per strategy type (sliders)
- [x] Date range picker (start/end date)
- [x] Run backtest button with loading state

## Phase 6: Results Display
- [x] Performance metrics cards (5 metrics: annual return, max drawdown, Sharpe, win rate, trades)
- [x] Equity curve chart using Recharts AreaChart
- [x] TradingView Widget embed for K-line chart
- [x] Trade signals list with buy/sell actions and P&L

## Phase 7: Multi-Result Comparison
- [x] Saved backtest results list page (History.tsx)
- [x] Multi-select for comparison from history page
- [x] Side-by-side comparison table with "best" highlighting (Compare.tsx)
- [x] Combined equity curve chart for multiple results

## Phase 8: Testing & Delivery
- [x] Write vitest tests for tRPC procedures (5 tests passing)
- [x] Final UI polish and responsiveness check
- [x] Save checkpoint and deliver to user

## Bugfix: Python Not Found in Production
- [x] Rewrite backtest engine in TypeScript (no Python dependency)
- [x] Fetch Yahoo Finance data via HTTP API in Node.js (yahoo-finance2 v3)
- [x] Implement MA Crossover, RSI, MACD, Bollinger Bands in TypeScript
- [x] Update tRPC router to call TypeScript engine directly
- [x] Update vitest tests for new engine
- [x] Save checkpoint and redeploy
