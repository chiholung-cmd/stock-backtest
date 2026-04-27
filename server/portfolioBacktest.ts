import { runBacktest } from "./backtest";
import type { BacktestInput, BacktestOutput, EquityPoint, TradeRecord } from "./backtest";

export interface PortfolioAsset {
  ticker: string;
  weight: number; // 0-100
}

export interface PortfolioBacktestInput extends Omit<BacktestInput, 'ticker'> {
  portfolio: PortfolioAsset[];
  rebalancePeriod: "none" | "quarterly" | "semi-annual" | "annual";
}

export interface RebalanceEvent {
  date: string;
  action: "REBALANCE";
  details: {
    ticker: string;
    targetWeight: number;
    actualWeight: number;
    sharesAdjusted: number;
  }[];
}

export interface PortfolioBacktestOutput extends Omit<BacktestOutput, 'ticker'> {
  portfolio: PortfolioAsset[];
  rebalancePeriod: string;
  rebalanceEvents: RebalanceEvent[];
  assetPerformance: {
    ticker: string;
    weight: number;
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
  }[];
  combinedEquityCurve: EquityPoint[];
  combinedTrades: TradeRecord[];
}

/**
 * 執行投資組合回測
 * 1. 對每個資產分別執行回測
 * 2. 根據權重合併結果
 * 3. 模擬再平衡事件
 */
export async function runPortfolioBacktest(
  input: PortfolioBacktestInput
): Promise<PortfolioBacktestOutput> {
  // 驗證權重總和
  const totalWeight = input.portfolio.reduce((sum, asset) => sum + asset.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(`Portfolio weights must sum to 100%, got ${totalWeight}%`);
  }

  // 1. 對每個資產執行回測
  const assetResults = await Promise.all(
    input.portfolio.map(asset =>
      runBacktest({
        ...input,
        ticker: asset.ticker,
      })
    )
  );

  // 2. 根據權重合併 equityCurve
  const combinedEquityCurve = mergeEquityCurves(
    assetResults.map((result, idx) => ({
      curve: result.equityCurve,
      weight: input.portfolio[idx].weight,
    }))
  );

  // 3. 計算再平衡事件
  const rebalanceEvents = calculateRebalanceEvents(
    combinedEquityCurve,
    input.portfolio,
    input.rebalancePeriod,
    input.startDate,
    input.endDate
  );

  // 4. 計算買入持有曲線（用於對比）
  const buyHoldCurve = calculateBuyAndHoldCurve(
    assetResults,
    input.portfolio,
    input.initialCapital
  );

  // 5. 計算組合績效指標
  const finalEquity = combinedEquityCurve[combinedEquityCurve.length - 1]?.value || input.initialCapital;
  const totalReturn = (finalEquity - input.initialCapital) / input.initialCapital;
  const days = combinedEquityCurve.length || 1;
  const annualizedReturn = Math.pow(1 + totalReturn, 252 / days) - 1;

  // 計算最大回撤
  let maxDrawdown = 0;
  let peak = input.initialCapital;
  for (const point of combinedEquityCurve) {
    if (point.value > peak) peak = point.value;
    const drawdown = (peak - point.value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // 計算 Sharpe Ratio（簡化版）
  const returns = [];
  for (let i = 1; i < combinedEquityCurve.length; i++) {
    const ret =
      (combinedEquityCurve[i].value - combinedEquityCurve[i - 1].value) /
      combinedEquityCurve[i - 1].value;
    returns.push(ret);
  }
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b) / returns.length : 0;
  const stdDev =
    returns.length > 1
      ? Math.sqrt(
          returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
            (returns.length - 1)
        )
      : 0;
  const sharpeRatio = stdDev > 0 ? (avgReturn * 252) / stdDev : 0;

  // 5. 計算每個資產的績效
  const assetPerformance = input.portfolio.map((asset, idx) => {
    const result = assetResults[idx];
    return {
      ticker: asset.ticker,
      weight: asset.weight,
      totalReturn: (result.totalProfit || 0) / input.initialCapital,
      annualizedReturn: result.annualizedReturn,
      maxDrawdown: result.maxDrawdown,
      sharpeRatio: result.sharpeRatio,
    };
  });

  // 6. 合併交易記錄
  const combinedTrades = mergeTradeRecords(
    assetResults.map((result, idx) => ({
      trades: result.trades,
      weight: input.portfolio[idx].weight,
    }))
  );

  return {
    strategy: input.strategy,
    strategyParams: input.params,
    startDate: input.startDate,
    endDate: input.endDate,
    annualizedReturn,
    maxDrawdown,
    sharpeRatio,
    winRate: 0, // 投資組合級別的勝率計算較複雜，暫時設為 0
    totalTrades: combinedTrades.length,
    totalProfit: finalEquity - input.initialCapital,
    averageProfit: (finalEquity - input.initialCapital) / Math.max(combinedTrades.length, 1),
    finalAsset: finalEquity,
    portfolio: input.portfolio,
    rebalancePeriod: input.rebalancePeriod,
    rebalanceEvents,
    assetPerformance,
    combinedEquityCurve,
    combinedTrades,
    equityCurve: combinedEquityCurve,
    buyAndHoldCurve: buyHoldCurve,
    trades: combinedTrades,
  };
}

/**
 * 合併多個資產的 equityCurve
 */
function mergeEquityCurves(
  curves: { curve: EquityPoint[]; weight: number }[]
): EquityPoint[] {
  if (curves.length === 0) return [];

  const dateMap = new Map<string, number[]>();

  // 收集所有日期和對應的值
  for (const { curve, weight } of curves) {
    for (const point of curve) {
      if (!dateMap.has(point.date)) {
        dateMap.set(point.date, []);
      }
      dateMap.get(point.date)!.push(point.value * (weight / 100));
    }
  }

  // 轉換為排序的陣列
  return Array.from(dateMap.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, values]) => ({
      date,
      value: values.reduce((a, b) => a + b, 0),
    }));
}

/**
 * 合併多個資產的交易記錄
 */
function mergeTradeRecords(
  trades: { trades: TradeRecord[]; weight: number }[]
): TradeRecord[] {
  const merged: TradeRecord[] = [];

  for (const { trades: assetTrades, weight } of trades) {
    for (const trade of assetTrades) {
      merged.push({
        ...trade,
        amount: trade.amount * (weight / 100),
        balance: trade.balance * (weight / 100),
      });
    }
  }

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 計算再平衡事件
 */
function calculateRebalanceEvents(
  equityCurve: EquityPoint[],
  portfolio: PortfolioAsset[],
  rebalancePeriod: string,
  startDate: string,
  endDate: string
): RebalanceEvent[] {
  if (rebalancePeriod === "none" || equityCurve.length === 0) {
    return [];
  }

  const events: RebalanceEvent[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // 根據再平衡頻率計算再平衡日期
  const rebalanceDates: Date[] = [];
  let current = new Date(start);

  while (current <= end) {
    rebalanceDates.push(new Date(current));

    if (rebalancePeriod === "quarterly") {
      current.setMonth(current.getMonth() + 3);
    } else if (rebalancePeriod === "semi-annual") {
      current.setMonth(current.getMonth() + 6);
    } else if (rebalancePeriod === "annual") {
      current.setFullYear(current.getFullYear() + 1);
    }
  }

  // 為每個再平衡日期創建事件
  for (const rebalanceDate of rebalanceDates) {
    const dateStr = rebalanceDate.toISOString().split("T")[0];

    // 找到最接近的 equityCurve 點
    const closestPoint = equityCurve.reduce((prev, curr) =>
      Math.abs(new Date(curr.date).getTime() - rebalanceDate.getTime()) <
      Math.abs(new Date(prev.date).getTime() - rebalanceDate.getTime())
        ? curr
        : prev
    );

    if (closestPoint) {
      events.push({
        date: closestPoint.date,
        action: "REBALANCE",
        details: portfolio.map(asset => ({
          ticker: asset.ticker,
          targetWeight: asset.weight,
          actualWeight: asset.weight, // 簡化：假設再平衡後回到目標權重
          sharesAdjusted: 0, // 簡化：不計算具體股數調整
        })),
      });
    }
  }

  return events;
}
