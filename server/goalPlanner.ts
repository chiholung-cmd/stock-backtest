import { BacktestOutput } from "./backtest";

export interface GoalInput {
  targetAnnualReturn: number;
  monthlyContribution: number;
  investmentPeriod: number;
  initialCapital: number;
  riskTolerance: "low" | "moderate" | "high";
  startDate: string;
  endDate: string;
}

export interface RecommendedPlan {
  id: string;
  name: string;
  description: string;
  portfolioComposition: { ticker: string; weight: number }[];
  strategy: {
    id: string;
    name: string;
    params: Record<string, number>;
  };
  expectedFinalValue: number;
  successProbability: number;
  riskLevel: string;
}

export async function generatePlan(input: GoalInput): Promise<RecommendedPlan[]> {
  const plans: RecommendedPlan[] = [];
  plans.push({
    id: "stable",
    name: "穩健增長方案",
    description: "以大盤為主，搭配債券對沖。",
    portfolioComposition: [{ ticker: "SPY", weight: 0.6 }, { ticker: "TLT", weight: 0.4 }],
    strategy: { id: "ma_crossover", name: "均線交叉", params: { shortPeriod: 20, longPeriod: 50 } },
    expectedFinalValue: 150000,
    successProbability: 0.85,
    riskLevel: "低"
  });
  return plans;
}

export async function calculateRequiredContribution() { return 0; }
