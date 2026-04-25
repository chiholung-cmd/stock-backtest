import { invokeLLM } from "./_core/llm";

/**
 * Strategy Optimizer: Converts natural language descriptions into quantitative strategy parameters
 * Supports complex multi-condition strategies and parameter optimization
 */

export interface StrategyDefinition {
  name: string;
  description: string;
  conditions: StrategyCondition[];
  parameters: Record<string, number>;
  riskLevel: "conservative" | "balanced" | "aggressive";
}

export interface StrategyCondition {
  type: "ma_crossover" | "rsi" | "macd" | "bollinger_bands" | "price_action" | "volume";
  operator: "and" | "or";
  threshold?: number;
  period?: number;
}

/**
 * Parse natural language input and convert to strategy definition
 */
export async function parseNaturalLanguageStrategy(
  description: string
): Promise<StrategyDefinition> {
  const prompt = `
你是一位專業的量化投資策略設計師。請分析以下投資策略描述，並將其轉化為結構化的策略定義。

用戶的策略描述：
"${description}"

請提供以下資訊：
1. **策略名稱**：簡潔的策略名稱
2. **風險等級**：conservative (保守) / balanced (平衡) / aggressive (激進)
3. **核心條件**：列出所有買入和賣出條件
4. **建議參數**：給出具體的技術指標參數

最後必須附上一個 JSON 代碼塊，格式如下：
\`\`\`json
{
  "name": "策略名稱",
  "description": "策略簡述",
  "riskLevel": "balanced",
  "buyConditions": [
    { "type": "ma_crossover", "description": "短期均線上穿長期均線", "params": { "shortPeriod": 10, "longPeriod": 30 } },
    { "type": "rsi", "description": "RSI 低於 30", "params": { "period": 14, "threshold": 30 } }
  ],
  "sellConditions": [
    { "type": "ma_crossover", "description": "短期均線下穿長期均線", "params": { "shortPeriod": 10, "longPeriod": 30 } }
  ],
  "parameters": {
    "shortPeriod": 10,
    "longPeriod": 30,
    "rsiPeriod": 14,
    "oversold": 30,
    "overbought": 70
  }
}
\`\`\`

請用繁體中文回答。
`;

  const result = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = result.choices[0].message.content as string;

  // 嘗試解析 JSON
  const match = responseText.match(/```json\n([\s\S]*?)\n```/);
  if (match) {
    const parsed = JSON.parse(match[1]);
    return {
      name: parsed.name || "Custom Strategy",
      description: parsed.description || "",
      conditions: [],
      parameters: parsed.parameters || {},
      riskLevel: parsed.riskLevel || "balanced",
    };
  }

  throw new Error("Failed to parse strategy definition from AI response");
}

/**
 * Optimize strategy parameters based on historical performance
 */
export async function optimizeStrategyParameters(
  strategyName: string,
  currentParams: Record<string, number>,
  historicalPerformance: {
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
  }
): Promise<Record<string, number>> {
  const prompt = `
你是一位專業的量化投資優化專家。根據以下策略的歷史表現，建議改進參數。

策略名稱：${strategyName}
當前參數：${JSON.stringify(currentParams, null, 2)}

歷史表現：
- 年化報酬率：${(historicalPerformance.annualizedReturn * 100).toFixed(2)}%
- 最大回撤：${(historicalPerformance.maxDrawdown * 100).toFixed(2)}%
- 夏普比率：${historicalPerformance.sharpeRatio.toFixed(2)}
- 勝率：${(historicalPerformance.winRate * 100).toFixed(2)}%

請分析這個策略的表現，並提出改進建議。如果表現已經很好，請保持現有參數；如果表現不佳，請建議調整參數以改進風險調整收益。

最後必須附上一個 JSON 代碼塊，包含優化後的參數：
\`\`\`json
{
  "optimizedParams": { /* 優化後的參數 */ },
  "reasoning": "優化的理由"
}
\`\`\`

請用繁體中文回答。
`;

  const result = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = result.choices[0].message.content as string;

  // 嘗試解析 JSON
  const match = responseText.match(/```json\n([\s\S]*?)\n```/);
  if (match) {
    const parsed = JSON.parse(match[1]);
    return parsed.optimizedParams || currentParams;
  }

  return currentParams;
}

/**
 * Generate strategy recommendations based on market conditions
 */
export async function generateStrategyRecommendations(
  marketCondition: string,
  riskTolerance: "low" | "medium" | "high"
): Promise<Array<{ name: string; description: string; params: Record<string, number> }>> {
  const prompt = `
你是一位專業的投資顧問。根據當前市場條件和用戶的風險承受度，推薦 3 個最適合的交易策略。

當前市場條件：${marketCondition}
用戶風險承受度：${riskTolerance === "low" ? "低" : riskTolerance === "medium" ? "中" : "高"}

請推薦 3 個策略，每個策略應該：
1. 與當前市場條件相匹配
2. 符合用戶的風險承受度
3. 包含具體的參數建議

最後必須附上一個 JSON 代碼塊，格式如下：
\`\`\`json
{
  "recommendations": [
    {
      "name": "策略名稱",
      "description": "策略簡述",
      "rationale": "為什麼在當前市場條件下推薦此策略",
      "params": { /* 具體參數 */ }
    }
  ]
}
\`\`\`

請用繁體中文回答。
`;

  const result = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = result.choices[0].message.content as string;

  // 嘗試解析 JSON
  const match = responseText.match(/```json\n([\s\S]*?)\n```/);
  if (match) {
    const parsed = JSON.parse(match[1]);
    return parsed.recommendations || [];
  }

  return [];
}
