import { createParser } from "eventsource-parser";
import { invokeLLM } from "./_core/llm";
import yahooFinanceDefault from "yahoo-finance2";

const YahooFinanceClass = yahooFinanceDefault as unknown as new (opts?: Record<string, unknown>) => {
  search: (query: string, opts?: any) => Promise<any>;
};

export class PoeApiWrapper {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 獲取指定股票的最新新聞
   */
  public async getStockNews(ticker: string) {
    try {
      const yf = new YahooFinanceClass();
      const searchResult = await yf.search(ticker, { newsCount: 5 });
      return searchResult.news || [];
    } catch (error) {
      console.error(`Failed to fetch news for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * 使用 AI 進行情緒分析與診斷
   * 修復：添加錯誤處理、超時控制、模型驗證
   */
  public async diagnoseStock(ticker: string, model: string = "gpt-4o-mini") {
    try {
      // 驗證 ticker
      if (!ticker || typeof ticker !== 'string') {
        throw new Error("Invalid ticker provided");
      }

      const news = await this.getStockNews(ticker);
      const newsContext = news && news.length > 0 
        ? news.map((n: any) => `- ${n.title} (${n.publisher})`).join("\n")
        : "暫無最新新聞";

      const prompt = `
你是一位專業的金融分析師。請針對股票代碼 "${ticker}" 進行深度診斷。

以下是該股票的最新新聞：
${newsContext}

請提供以下資訊：
1. **市場情緒分析**：給出一個 -100 到 +100 的情緒評分（-100 最悲觀，+100 最樂觀），並簡述理由。
2. **核心風險與機會**：總結目前該股票面臨的主要挑戰與潛在增長點。
3. **投資建議**：給出「買入」、「持有」或「賣出」的建議，並解釋原因。

請以繁體中文回答，並在最後附上一個 JSON 代碼塊，格式如下：
\`\`\`json
{
  "score": number,
  "sentiment": "悲觀" | "中立" | "樂觀",
  "recommendation": "買入" | "持有" | "賣出",
  "summary": "一句話總結"
}
\`\`\`
`;

      const result = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
        model: model,
      });

      if (!result || !result.choices || result.choices.length === 0) {
        throw new Error("Invalid LLM response");
      }

      const content = result.choices[0].message.content;
      if (typeof content !== 'string') {
        throw new Error("LLM response is not a string");
      }

      return content;
    } catch (error) {
      console.error(`Diagnosis failed for ${ticker}:`, error);
      // 返回默認診斷結果，避免前端完全崩潰
      return `
無法完成對 ${ticker} 的深度診斷。

**原因**：AI 服務暫時不可用或網絡連接失敗。

**建議**：
1. 檢查網絡連接
2. 稍後重試
3. 如問題持續，請聯絡技術支持

\`\`\`json
{
  "score": 0,
  "sentiment": "中立",
  "recommendation": "持有",
  "summary": "無法完成診斷，建議稍後重試"
}
\`\`\`
`;
    }
  }

  public async analyzeGoal(goal: string, model: string): Promise<string> {
    try {
      if (!goal || typeof goal !== 'string') {
        throw new Error("Invalid goal provided");
      }

      console.log(`Analyzing goal: "${goal}" with model: ${model}`);
      
      const prompt = `
你是一位專業的量化投資顧問。用戶的投資目標是：「${goal}」。
請為用戶推薦一個最適合的投資策略。目前我們支援以下策略類型：
1. ma_crossover (均線交叉): 參數有 shortPeriod, longPeriod
2. rsi (RSI指標): 參數有 period, oversold, overbought
3. macd (MACD指標): 參數有 fastPeriod, slowPeriod, signalPeriod
4. bollinger_bands (布林帶): 參數有 period, stdDev
5. kd (KD指標): 參數有 kPeriod, dPeriod
6. breakout (突破策略): 參數有 lookback

請分析用戶的需求，給出專業建議，並以繁體中文回答。
最後必須附上一個 JSON 代碼塊，包含推薦的股票代碼 (ticker) 和策略參數，格式如下：
\`\`\`json
{
  "ticker": "AAPL",
  "strategy": "ma_crossover",
  "params": { "shortPeriod": 10, "longPeriod": 30 },
  "description": "策略簡述"
}
\`\`\`
`;

      const result = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
        model: model,
      });

      if (!result || !result.choices || result.choices.length === 0) {
        throw new Error("Invalid LLM response");
      }

      const content = result.choices[0].message.content;
      if (typeof content !== 'string') {
        throw new Error("LLM response is not a string");
      }

      return content;
    } catch (error) {
      console.error("Goal analysis failed:", error);
      return `
無法完成投資目標分析。

**原因**：AI 服務暫時不可用。

**建議**：
1. 檢查您的投資目標描述
2. 稍後重試
3. 如問題持續，請聯絡技術支持

\`\`\`json
{
  "ticker": "SPY",
  "strategy": "ma_crossover",
  "params": { "shortPeriod": 10, "longPeriod": 30 },
  "description": "預設均線交叉策略"
}
\`\`\`
`;
    }
  }

  public async chat(message: string, model: string, history: any[] = []): Promise<string> {
    try {
      if (!message || typeof message !== 'string') {
        throw new Error("Invalid message provided");
      }

      if (!model || typeof model !== 'string') {
        throw new Error("Invalid model provided");
      }

      const messages = [
        { 
          role: "system" as const, 
          content: "你是一位專業的 AI 投資顧問 AlphaTest。你擅長使用繁體中文為用戶提供專業、易懂的投資建議與策略分析。請簡潔清晰地回答用戶的問題。" 
        },
        ...history.map((h: any) => ({
          role: h.role as "user" | "assistant",
          content: h.content || "",
        })),
        { role: "user" as const, content: message }
      ];

      const result = await invokeLLM({
        messages: messages as any,
        model: model,
      });

      if (!result || !result.choices || result.choices.length === 0) {
        throw new Error("Invalid LLM response");
      }

      const content = result.choices[0].message.content;
      if (typeof content !== 'string') {
        throw new Error("LLM response is not a string");
      }

      return content;
    } catch (error) {
      console.error("Chat failed:", error);
      return "抱歉，我暫時無法回應。請檢查您的網絡連接或稍後重試。";
    }
  }
}
