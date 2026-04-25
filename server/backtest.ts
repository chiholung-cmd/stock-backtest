import yahooFinanceDefault from "yahoo-finance2";
const YahooFinanceClass = yahooFinanceDefault as unknown as new (opts?: Record<string, unknown>) => {
  historical: (ticker: string, opts: Record<string, unknown>) => Promise<Array<{ date: Date; close?: number | null; adjClose?: number | null; open?: number | null; high?: number | null; low?: number | null; volume?: number | null }>>;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OHLCVRow {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface TradeRecord {
  date: string;
  action: "BUY" | "SELL" | "SELL (Close)" | "CONTRIBUTE" | "REDRAW";
  price: number;
  amount: number;
  pnl: number | null;
  balance: number;
}

export interface EquityPoint {
  date: string;
  value: number;
}

export interface BacktestInput {
  ticker: string;
  strategy: string; // supports comma-separated for combinations: "ma_crossover,rsi"
  params: Record<string, number>;
  startDate: string;
  endDate: string;
  timeframe: "1d" | "1wk" | "1mo";
  initialCapital: number;
  contributeAmount: number;
  contributePeriod: "none" | "weekly" | "monthly" | "quarterly";
  redrawAmount: number;
  redrawPeriod: "none" | "weekly" | "monthly" | "quarterly";
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

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchData(ticker: string, startDate: string, endDate: string, interval: "1d" | "1wk" | "1mo" = "1d"): Promise<OHLCVRow[]> {
  const yf = new YahooFinanceClass({ suppressNotices: ["ripHistorical"] });

  const result = await yf.historical(ticker, {
    period1: startDate,
    period2: endDate,
    interval: interval,
  });

  if (!result || result.length === 0) {
    throw new Error(`No data found for ticker "${ticker}".`);
  }

  return result
    .filter((q) => q.close != null)
    .map((q) => ({
      date: new Date(q.date).toISOString().slice(0, 10),
      close: q.adjClose ?? q.close ?? 0,
      open: q.open ?? undefined,
      high: q.high ?? undefined,
      low: q.low ?? undefined,
      volume: q.volume ?? undefined,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Technical Indicators ─────────────────────────────────────────────────────

function sma(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    const slice = values.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function rsi(values: number[], period: number): (number | null)[] {
  const results: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return results;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  results[period] = 100 - 100 / (1 + avgGain / (avgLoss || 1));

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    results[i] = 100 - 100 / (1 + avgGain / (avgLoss || 1));
  }

  return results;
}

// ─── Backtest Logic ───────────────────────────────────────────────────────────

export async function runBacktest(input: BacktestInput): Promise<BacktestOutput> {
  const data = await fetchData(input.ticker, input.startDate, input.endDate, input.timeframe);
  const closes = data.map(d => d.close);
  
  // Indicators for signals
  const maShort = sma(closes, input.params.shortPeriod || 10);
  const maLong = sma(closes, input.params.longPeriod || 30);
  const rsiVals = rsi(closes, input.params.rsiPeriod || 14);

  let cash = input.initialCapital;
  let shares = 0;
  const trades: TradeRecord[] = [];
  const equityCurve: EquityPoint[] = [];

  const isContributeTime = (dateStr: string, index: number) => {
    if (input.contributePeriod === "none") return false;
    if (input.contributePeriod === "weekly") return index % 5 === 0;
    if (input.contributePeriod === "monthly") return index % 20 === 0;
    if (input.contributePeriod === "quarterly") return index % 60 === 0;
    return false;
  };

  const isRedrawTime = (dateStr: string, index: number) => {
    if (input.redrawPeriod === "none") return false;
    if (input.redrawPeriod === "weekly") return index % 5 === 0;
    if (input.redrawPeriod === "monthly") return index % 20 === 0;
    if (input.redrawPeriod === "quarterly") return index % 60 === 0;
    return false;
  };

  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;

    // Handle Contribution
    if (isContributeTime(date, i)) {
      cash += input.contributeAmount;
      trades.push({ date, action: "CONTRIBUTE", price, amount: input.contributeAmount, pnl: null, balance: cash + shares * price });
    }

    // Handle Redraw
    if (isRedrawTime(date, i)) {
      const actualRedraw = Math.min(input.redrawAmount, cash);
      cash -= actualRedraw;
      trades.push({ date, action: "REDRAW", price, amount: actualRedraw, pnl: null, balance: cash + shares * price });
    }

    // Signals (Simplified combination logic)
    const maBuy = maShort[i] !== null && maLong[i] !== null && maShort[i]! > maLong[i]! && maShort[i-1]! <= maLong[i-1]!;
    const maSell = maShort[i] !== null && maLong[i] !== null && maShort[i]! < maLong[i]! && maShort[i-1]! >= maLong[i-1]!;
    
    const rsiBuy = rsiVals[i] !== null && rsiVals[i]! < (input.params.oversold || 30);
    const rsiSell = rsiVals[i] !== null && rsiVals[i]! > (input.params.overbought || 70);

    let buySignal = false;
    let sellSignal = false;

    if (input.strategy.includes("ma_crossover") && input.strategy.includes("rsi")) {
      buySignal = maBuy && rsiBuy; // Combination: Both must be true
      sellSignal = maSell || rsiSell; // Sell if either is true
    } else if (input.strategy.includes("ma_crossover")) {
      buySignal = maBuy;
      sellSignal = maSell;
    } else if (input.strategy.includes("rsi")) {
      buySignal = rsiBuy;
      sellSignal = rsiSell;
    }

    if (buySignal && cash > 0) {
      const buyShares = Math.floor(cash / price);
      if (buyShares > 0) {
        shares += buyShares;
        cash -= buyShares * price;
        trades.push({ date, action: "BUY", price, amount: buyShares, pnl: null, balance: cash + shares * price });
      }
    } else if (sellSignal && shares > 0) {
      const pnl = (price - trades[trades.length - 1].price) * shares;
      cash += shares * price;
      trades.push({ date, action: "SELL", price, amount: shares, pnl, balance: cash });
      shares = 0;
    }

    equityCurve.push({ date, value: cash + shares * price });
  }

  // Close final position
  if (shares > 0) {
    const lastPrice = data[data.length - 1].close;
    cash += shares * lastPrice;
    trades.push({ date: data[data.length - 1].date, action: "SELL (Close)", price: lastPrice, amount: shares, pnl: null, balance: cash });
    shares = 0;
  }

  // Metrics Calculation
  const totalReturn = (equityCurve[equityCurve.length - 1].value - input.initialCapital) / input.initialCapital;
  const days = data.length || 1;
  const annualizedReturn = Math.pow(1 + totalReturn, 252 / days) - 1;

  // Max Drawdown
  let maxEquity = -Infinity;
  let maxDD = 0;
  for (const p of equityCurve) {
    if (p.value > maxEquity) maxEquity = p.value;
    const dd = (maxEquity - p.value) / maxEquity;
    if (dd > maxDD) maxDD = dd;
  }

  // Win Rate
  const completedTrades = trades.filter(t => t.action === "SELL" || t.action === "SELL (Close)");
  const winningTrades = completedTrades.filter(t => (t.pnl || 0) > 0);
  const winRate = completedTrades.length > 0 ? winningTrades.length / completedTrades.length : 0;

  // Sharpe Ratio (Simplified: using daily returns std dev)
  const dailyReturns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    dailyReturns.push((equityCurve[i].value - equityCurve[i-1].value) / equityCurve[i-1].value);
  }
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
  const stdDev = Math.sqrt(dailyReturns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / (dailyReturns.length || 1));
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  return {
    ticker: input.ticker,
    strategy: input.strategy,
    strategyParams: input.params,
    startDate: input.startDate,
    endDate: input.endDate,
    annualizedReturn,
    maxDrawdown: maxDD,
    sharpeRatio,
    winRate,
    totalTrades: completedTrades.length,
    equityCurve,
    trades,
  };
}
