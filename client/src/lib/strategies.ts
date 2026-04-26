export type Strategy = "ma_crossover" | "rsi" | "macd" | "bollinger_bands" | "kd" | "breakout" | "custom";

export interface StrategyParam {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
}

export interface StrategyDefinition {
  id: Strategy;
  name: string;
  description: string;
  color: string;
  params: StrategyParam[];
}

export const STRATEGIES: StrategyDefinition[] = [
  {
    id: "ma_crossover",
    name: "MA 交叉",
    description: "短期均線上穿長期均線買入，下穿賣出",
    color: "#0d9488",
    params: [
      { key: "shortPeriod", label: "短期 MA 週期", min: 2, max: 100, default: 10, step: 1 },
      { key: "longPeriod", label: "長期 MA 週期", min: 5, max: 300, default: 30, step: 1 },
    ],
  },
  {
    id: "rsi",
    name: "RSI",
    description: "RSI 突破超賣區買入，突破超買區賣出",
    color: "#f59e0b",
    params: [
      { key: "rsiPeriod", label: "RSI 週期", min: 2, max: 50, default: 14, step: 1 },
      { key: "oversold", label: "超賣閾值", min: 10, max: 45, default: 30, step: 1 },
      { key: "overbought", label: "超買閾值", min: 55, max: 90, default: 70, step: 1 },
    ],
  },
  {
    id: "kd",
    name: "KD 指標",
    description: "K線上穿D線且在低位買入，高位下穿賣出",
    color: "#ec4899",
    params: [
      { key: "kPeriod", label: "K 週期", min: 5, max: 50, default: 14, step: 1 },
      { key: "dPeriod", label: "D 週期", min: 2, max: 20, default: 3, step: 1 },
    ],
  },
  {
    id: "breakout",
    name: "突破策略",
    description: "價格突破前高買入，跌破前低賣出",
    color: "#06b6d4",
    params: [
      { key: "breakoutPeriod", label: "回溯週期", min: 5, max: 100, default: 20, step: 1 },
    ],
  },
  {
    id: "macd",
    name: "MACD",
    description: "MACD 線上穿信號線買入，下穿賣出",
    color: "#3b82f6",
    params: [
      { key: "fastPeriod", label: "快線週期 (EMA)", min: 2, max: 50, default: 12, step: 1 },
      { key: "slowPeriod", label: "慢線週期 (EMA)", min: 5, max: 100, default: 26, step: 1 },
      { key: "signalPeriod", label: "信號線週期", min: 2, max: 30, default: 9, step: 1 },
    ],
  },
  {
    id: "bollinger_bands",
    name: "布林帶",
    description: "價格觸及下軌買入，觸及上軌賣出",
    color: "#8b5cf6",
    params: [
      { key: "period", label: "均線週期", min: 5, max: 100, default: 20, step: 1 },
      { key: "stdDev", label: "標準差倍數", min: 0.5, max: 4, default: 2, step: 0.1 },
    ],
  },
];

export function getStrategyDefinition(id: Strategy): StrategyDefinition | undefined {
  return STRATEGIES.find(s => s.id === id);
}

export function getDefaultParams(strategyId: Strategy): Record<string, number> {
  const strategy = getStrategyDefinition(strategyId);
  if (!strategy) return {};
  
  return strategy.params.reduce((acc, param) => {
    acc[param.key] = param.default;
    return acc;
  }, {} as Record<string, number>);
}
