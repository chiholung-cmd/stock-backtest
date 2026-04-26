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
  date: string; // YYYY-MM-DD
  year?: number; // 提取的年份，便於前端按年份分組
  action: "BUY" | "SELL" | "SELL (Close)" | "CONTRIBUTE" | "REDRAW";
  price: number;
  amount: number;
  pnl: number | null;
  balance: number;
}

export interface EquityPoint {
  date: string;
  value: number;
  buyHoldValue?: number;
}

export interface BacktestInput {
  ticker: string;
  strategy: string; 
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
  totalProfit: number;
  averageProfit: number;
  finalAsset: number;
  equityCurve: EquityPoint[];
  buyAndHoldCurve?: EquityPoint[];
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

function calculateStochastic(data: OHLCVRow[], kPeriod: number = 14, dPeriod: number = 3) {
  const kValues: (number | null)[] = new Array(data.length).fill(null);
  const dValues: (number | null)[] = new Array(data.length).fill(null);

  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const low = Math.min(...slice.map(d => d.low ?? d.close));
    const high = Math.max(...slice.map(d => d.high ?? d.close));
    const currentClose = data[i].close;
    
    if (high !== low) {
      kValues[i] = ((currentClose - low) / (high - low)) * 100;
    } else {
      kValues[i] = 50;
    }
  }

  // Calculate D (SMA of K)
  for (let i = kPeriod + dPeriod - 2; i < data.length; i++) {
    const slice = kValues.slice(i - dPeriod + 1, i + 1).filter(v => v !== null) as number[];
    if (slice.length === dPeriod) {
      dValues[i] = slice.reduce((a, b) => a + b, 0) / dPeriod;
    }
  }

  return { k: kValues, d: dValues };
}

// ─── Backtest Logic ───────────────────────────────────────────────────────────

export async function runBacktest(input: BacktestInput): Promise<BacktestOutput> {
  const data = await fetchData(input.ticker, input.startDate, input.endDate, input.timeframe);
  const closes = data.map(d => d.close);
  
  // Indicators for signals
  const maShort = sma(closes, input.params.shortPeriod || 10);
  const maLong = sma(closes, input.params.longPeriod || 30);
  const rsiVals = rsi(closes, input.params.rsiPeriod || 14);
  const stoch = calculateStochastic(data, input.params.kPeriod || 14, input.params.dPeriod || 3);

  let cash = input.initialCapital;
  let shares = 0;
  let lastBuyPrice = 0; 
  const trades: TradeRecord[] = [];
  const equityCurve: EquityPoint[] = [];

  const isContributeTime = (index: number) => {
    if (input.contributePeriod === "none") return false;
    if (input.contributePeriod === "weekly") return index > 0 && index % 5 === 0;
    if (input.contributePeriod === "monthly") return index > 0 && index % 20 === 0;
    if (input.contributePeriod === "quarterly") return index > 0 && index % 60 === 0;
    return false;
  };

  const isRedrawTime = (index: number) => {
    if (input.redrawPeriod === "none") return false;
    if (input.redrawPeriod === "weekly") return index > 0 && index % 5 === 0;
    if (input.redrawPeriod === "monthly") return index > 0 && index % 20 === 0;
    if (input.redrawPeriod === "quarterly") return index > 0 && index % 60 === 0;
    return false;
  };

  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;

      // Handle Contribute
    if (isContributeTime(i)) {
      cash += input.contributeAmount;
      const balance = cash + shares * price;
      const year = new Date(date).getFullYear();
      trades.push({ date, year, action: "CONTRIBUTE", price, amount: input.contributeAmount, pnl: null, balance });
    }

    // Handle Redraw
    if (isRedrawTime(i)) {
      const actualRedraw = Math.min(input.redrawAmount, cash);
      cash -= actualRedraw;
      const balance = cash + shares * price;
      const year = new Date(date).getFullYear();
      trades.push({ date, year, action: "REDRAW", price, amount: actualRedraw, pnl: null, balance });
    }

    // Signal Logic
    let buySignal = false;
    let sellSignal = false;

    // 1. MA Crossover
    const maBuy = i > 0 && maShort[i] !== null && maLong[i] !== null && maShort[i]! > maLong[i]! && maShort[i-1]! <= maLong[i-1]!;
    const maSell = i > 0 && maShort[i] !== null && maLong[i] !== null && maShort[i]! < maLong[i]! && maShort[i-1]! >= maLong[i-1]!;
    
    // 2. RSI
    const rsiBuy = rsiVals[i] !== null && rsiVals[i]! < (input.params.oversold || 30);
    const rsiSell = rsiVals[i] !== null && rsiVals[i]! > (input.params.overbought || 70);

    // 3. KD (Stochastic)
    const kdBuy = i > 0 && stoch.k[i] !== null && stoch.d[i] !== null && stoch.k[i]! > stoch.d[i]! && stoch.k[i-1]! <= stoch.d[i-1]! && stoch.k[i]! < 20;
    const kdSell = i > 0 && stoch.k[i] !== null && stoch.d[i] !== null && stoch.k[i]! < stoch.d[i]! && stoch.k[i-1]! >= stoch.d[i-1]! && stoch.k[i]! > 80;

    // 4. Breakout (Price Action)
    const lookback = input.params.breakoutPeriod || 20;
    let breakoutBuy = false;
    let breakoutSell = false;
    if (i >= lookback) {
      const pastHigh = Math.max(...closes.slice(i - lookback, i));
      const pastLow = Math.min(...closes.slice(i - lookback, i));
      breakoutBuy = price > pastHigh;
      breakoutSell = price < pastLow;
    }

    // Strategy Dispatch
    const s = input.strategy.toLowerCase();
    if (s.includes("ma_crossover")) {
      buySignal = maBuy; sellSignal = maSell;
    } else if (s.includes("rsi")) {
      buySignal = rsiBuy; sellSignal = rsiSell;
    } else if (s.includes("kd")) {
      buySignal = kdBuy; sellSignal = kdSell;
    } else if (s.includes("breakout")) {
      buySignal = breakoutBuy; sellSignal = breakoutSell;
    }

    // Execute Trades
    if (buySignal && cash > 0 && shares === 0) {
      const buyShares = Math.floor(cash / price);
      if (buyShares > 0) {
        shares = buyShares;
        lastBuyPrice = price;
        cash -= buyShares * price;
        const balance = cash + shares * price;
        const year = new Date(date).getFullYear();
        trades.push({ date, year, action: "BUY", price, amount: buyShares, pnl: null, balance });
      }
    } else if (sellSignal && shares > 0) {
      const pnlPercent = (price - lastBuyPrice) / lastBuyPrice;
      cash += shares * price;
      const balance = cash;
      const year = new Date(date).getFullYear();
      trades.push({ date, year, action: "SELL", price, amount: shares, pnl: pnlPercent, balance });
      shares = 0;
      lastBuyPrice = 0;
    }

    // IMPORTANT: 每日資產淨值必須在當天所有交易執行完後計算
    const dailyBalance = cash + shares * price;
    equityCurve.push({ date, value: dailyBalance, buyHoldValue: 0 }); // 稍後會填充
  }

  // Close final position for reporting
  if (shares > 0) {
    const lastPrice = data[data.length - 1].close;
    const pnlPercent = (lastPrice - lastBuyPrice) / lastBuyPrice;
    const finalBalance = cash + shares * lastPrice;
    const year = new Date(data[data.length - 1].date).getFullYear();
    trades.push({ date: data[data.length - 1].date, year, action: "SELL (Close)", price: lastPrice, amount: shares, pnl: pnlPercent, balance: finalBalance });
  }

  // Calculate Buy & Hold Curve for comparison and merge into equityCurve
  if (data.length > 0) {
    const firstPrice = data[0].close;
    const initialShares = input.initialCapital / firstPrice;
    const bhMap = new Map<string, number>();
    for (const d of data) {
      bhMap.set(d.date, initialShares * d.close);
    }
    // 將 buyHoldValue 填充到 equityCurve
    for (const point of equityCurve) {
      point.buyHoldValue = bhMap.get(point.date) || 0;
    }
  }

  // Metrics Calculation
  const finalEquity = equityCurve[equityCurve.length - 1].value;
  
  // 計算總投入資金 (初始資金 + 定期定額總額 - 定期提領總額)
  const totalContributed = trades.filter(t => t.action === "CONTRIBUTE").reduce((sum, t) => sum + t.amount, 0);
  const totalRedrawn = trades.filter(t => t.action === "REDRAW").reduce((sum, t) => sum + t.amount, 0);
  const netInvestment = input.initialCapital + totalContributed - totalRedrawn;
  
  const totalReturn = (finalEquity - netInvestment) / netInvestment;
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

  // Sharpe Ratio
  const dailyReturns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i-1].value > 0) {
      dailyReturns.push((equityCurve[i].value - equityCurve[i-1].value) / equityCurve[i-1].value);
    }
  }
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
  const stdDev = Math.sqrt(dailyReturns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / (dailyReturns.length || 1));
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // 計算總損益、平均損益
  // 注意：這裡的損益計算應基於交易日誌中的 pnl (百分比) 轉換為金額，以保持一致
  const totalProfit = finalEquity - netInvestment;
  const averageProfit = completedTrades.length > 0 ? totalProfit / completedTrades.length : 0;

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
    totalProfit,
    averageProfit,
    finalAsset: finalEquity,
    equityCurve,
    trades,
  };
}
