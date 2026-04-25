/**
 * Stock Backtest Engine (TypeScript)
 * Strategies: MA Crossover, RSI, MACD, Bollinger Bands
 * Data Source: Yahoo Finance via yahoo-finance2 v3
 */

import yahooFinanceDefault from "yahoo-finance2";
// yahoo-finance2 v3: the default export is the class constructor
const YahooFinanceClass = yahooFinanceDefault as unknown as new (opts?: Record<string, unknown>) => {
  historical: (ticker: string, opts: Record<string, unknown>) => Promise<Array<{ date: Date; close?: number | null; adjClose?: number | null }>>;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OHLCVRow {
  date: string;
  close: number;
}

export interface TradeRecord {
  date: string;
  action: "BUY" | "SELL" | "SELL (Close)";
  price: number;
  pnl: number | null;
}

export interface EquityPoint {
  date: string;
  value: number;
}

export interface BacktestOutput {
  ticker: string;
  strategy: string;
  strategyParams: Record<string, number>;
  startDate: string;
  endDate: string;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  equityCurve: EquityPoint[];
  trades: TradeRecord[];
}

export interface BacktestInput {
  ticker: string;
  strategy: "ma_crossover" | "rsi" | "macd" | "bollinger_bands";
  params: Record<string, number>;
  startDate: string;
  endDate: string;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchData(ticker: string, startDate: string, endDate: string): Promise<OHLCVRow[]> {
  const yf = new YahooFinanceClass({ suppressNotices: ["ripHistorical"] });

  // Use historical which maps to chart internally in v3
  const result: Array<{ date: Date; close?: number | null; adjClose?: number | null }> =
    await yf.historical(ticker, {
      period1: startDate,
      period2: endDate,
    });

  if (!result || result.length === 0) {
    throw new Error(`No data found for ticker "${ticker}". Please verify the symbol is correct.`);
  }

  return result
    .filter((q) => q.close != null)
    .map((q) => ({
      date: new Date(q.date).toISOString().slice(0, 10),
      close: q.adjClose ?? q.close ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Technical Indicator Helpers ─────────────────────────────────────────────

function sma(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    const slice = values.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      result.push(values[0]!);
    } else {
      result.push(values[i]! * k + result[i - 1]! * (1 - k));
    }
  }
  return result;
}

function stdDevArr(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    return Math.sqrt(variance);
  });
}

// ─── Signal Generation ────────────────────────────────────────────────────────

function signalMACrossover(rows: OHLCVRow[], params: Record<string, number>): number[] {
  const shortP = Math.round(params.shortPeriod ?? 10);
  const longP = Math.round(params.longPeriod ?? 30);
  const closes = rows.map((r) => r.close);
  const maShort = sma(closes, shortP);
  const maLong = sma(closes, longP);

  return rows.map((_, i) => {
    if (i === 0) return 0;
    const s = maShort[i], s1 = maShort[i - 1];
    const l = maLong[i], l1 = maLong[i - 1];
    if (s === null || s1 === null || l === null || l1 === null) return 0;
    if (s > l && s1 <= l1) return 1;
    if (s < l && s1 >= l1) return -1;
    return 0;
  });
}

function signalRSI(rows: OHLCVRow[], params: Record<string, number>): number[] {
  const period = Math.round(params.period ?? 14);
  const oversold = params.oversold ?? 30;
  const overbought = params.overbought ?? 70;
  const closes = rows.map((r) => r.close);

  const rsi: (number | null)[] = closes.map((_, i) => {
    if (i < period) return null;
    const slice = closes.slice(i - period, i + 1);
    let gains = 0, losses = 0;
    for (let j = 1; j < slice.length; j++) {
      const diff = slice[j]! - slice[j - 1]!;
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  });

  return rows.map((_, i) => {
    if (i === 0) return 0;
    const r = rsi[i], r1 = rsi[i - 1];
    if (r === null || r1 === null) return 0;
    if (r > oversold && r1 <= oversold) return 1;
    if (r < overbought && r1 >= overbought) return -1;
    return 0;
  });
}

function signalMACD(rows: OHLCVRow[], params: Record<string, number>): number[] {
  const fastP = Math.round(params.fastPeriod ?? 12);
  const slowP = Math.round(params.slowPeriod ?? 26);
  const signalP = Math.round(params.signalPeriod ?? 9);
  const closes = rows.map((r) => r.close);

  const emaFast = ema(closes, fastP);
  const emaSlow = ema(closes, slowP);
  const macdLine = emaFast.map((f, i) => f - emaSlow[i]!);
  const signalLine = ema(macdLine, signalP);

  return rows.map((_, i) => {
    if (i === 0) return 0;
    const m = macdLine[i]!, m1 = macdLine[i - 1]!;
    const s = signalLine[i]!, s1 = signalLine[i - 1]!;
    if (m > s && m1 <= s1) return 1;
    if (m < s && m1 >= s1) return -1;
    return 0;
  });
}

function signalBollingerBands(rows: OHLCVRow[], params: Record<string, number>): number[] {
  const period = Math.round(params.period ?? 20);
  const multiplier = params.stdDev ?? 2;
  const closes = rows.map((r) => r.close);
  const mid = sma(closes, period);
  const sd = stdDevArr(closes, period);

  return rows.map((_, i) => {
    if (i === 0) return 0;
    const m = mid[i], m1 = mid[i - 1];
    const s = sd[i], s1 = sd[i - 1];
    if (m === null || m1 === null || s === null || s1 === null) return 0;
    const lower = m - multiplier * s;
    const lower1 = m1 - multiplier * s1;
    const upper = m + multiplier * s;
    const upper1 = m1 + multiplier * s1;
    const c = closes[i]!, c1 = closes[i - 1]!;
    if (c > lower && c1 <= lower1) return 1;
    if (c > upper && c1 <= upper1) return -1;
    return 0;
  });
}

// ─── Trade Simulation ─────────────────────────────────────────────────────────

function simulateTrades(
  rows: OHLCVRow[],
  signals: number[],
  initialCapital = 10000
): { equityCurve: EquityPoint[]; trades: TradeRecord[] } {
  let equity = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: EquityPoint[] = [];
  const trades: TradeRecord[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const price = row.close;
    const signal = signals[i]!;

    if (signal === 1 && position === 0) {
      position = equity / price;
      entryPrice = price;
      equity = 0;
      trades.push({ date: row.date, action: "BUY", price: +price.toFixed(2), pnl: null });
    } else if (signal === -1 && position > 0) {
      equity = position * price;
      const pnl = (price - entryPrice) / entryPrice;
      trades.push({ date: row.date, action: "SELL", price: +price.toFixed(2), pnl: +pnl.toFixed(4) });
      position = 0;
      entryPrice = 0;
    }

    const currentValue = equity + position * price;
    equityCurve.push({ date: row.date, value: +currentValue.toFixed(2) });
  }

  // Close open position at end
  if (position > 0 && rows.length > 0) {
    const lastRow = rows[rows.length - 1]!;
    const lastPrice = lastRow.close;
    equity = position * lastPrice;
    const pnl = (lastPrice - entryPrice) / entryPrice;
    trades.push({
      date: lastRow.date,
      action: "SELL (Close)",
      price: +lastPrice.toFixed(2),
      pnl: +pnl.toFixed(4),
    });
  }

  return { equityCurve, trades };
}

// ─── Performance Metrics ──────────────────────────────────────────────────────

function calcPerformance(
  equityCurve: EquityPoint[],
  trades: TradeRecord[],
  riskFreeRate = 0.04
): {
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
} {
  if (equityCurve.length < 2) {
    return { annualizedReturn: 0, maxDrawdown: 0, sharpeRatio: 0, winRate: 0, totalTrades: 0 };
  }

  const values = equityCurve.map((p) => p.value);
  const initial = values[0]!;
  const final = values[values.length - 1]!;

  const firstDate = new Date(equityCurve[0]!.date).getTime();
  const lastDate = new Date(equityCurve[equityCurve.length - 1]!.date).getTime();
  const totalDays = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));

  const totalReturn = (final - initial) / initial;
  const annualizedReturn = (1 + totalReturn) ** (365 / totalDays) - 1;

  // Max Drawdown
  let peak = values[0]!;
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }

  // Sharpe Ratio
  const dailyReturns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    dailyReturns.push((values[i]! - values[i - 1]!) / values[i - 1]!);
  }
  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / dailyReturns.length;
  const stdDevReturn = Math.sqrt(variance);
  const dailyRFR = riskFreeRate / 252;
  const sharpeRatio =
    stdDevReturn > 0 ? ((meanReturn - dailyRFR) / stdDevReturn) * Math.sqrt(252) : 0;

  // Win Rate
  const completedTrades = trades.filter((t) => t.pnl !== null);
  const totalTrades = completedTrades.length;
  const winRate =
    totalTrades > 0
      ? completedTrades.filter((t) => (t.pnl ?? 0) > 0).length / totalTrades
      : 0;

  return {
    annualizedReturn: +annualizedReturn.toFixed(4),
    maxDrawdown: +maxDD.toFixed(4),
    sharpeRatio: +sharpeRatio.toFixed(4),
    winRate: +winRate.toFixed(4),
    totalTrades,
  };
}

// ─── Main Entry ───────────────────────────────────────────────────────────────

const STRATEGY_FNS: Record<
  string,
  (rows: OHLCVRow[], params: Record<string, number>) => number[]
> = {
  ma_crossover: signalMACrossover,
  rsi: signalRSI,
  macd: signalMACD,
  bollinger_bands: signalBollingerBands,
};

export async function runBacktest(input: BacktestInput): Promise<BacktestOutput> {
  const { ticker, strategy, params, startDate, endDate } = input;

  if (!STRATEGY_FNS[strategy]) {
    throw new Error(`Unknown strategy: ${strategy}`);
  }

  const rows = await fetchData(ticker.toUpperCase(), startDate, endDate);

  if (rows.length < 30) {
    throw new Error(
      `Insufficient data: only ${rows.length} trading days found. Please extend the date range.`
    );
  }

  const signals = STRATEGY_FNS[strategy]!(rows, params);
  const { equityCurve, trades } = simulateTrades(rows, signals);
  const metrics = calcPerformance(equityCurve, trades);

  return {
    ticker: ticker.toUpperCase(),
    strategy,
    strategyParams: params,
    startDate,
    endDate,
    ...metrics,
    equityCurve,
    trades,
  };
}
