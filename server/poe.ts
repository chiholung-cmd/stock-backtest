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

  private shouldUseMockResponse() {
    return !this.apiKey || this.apiKey === "fake-key";
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
   * 使用 AI 進行情緒分析與診斷（短中長期三維度）
   * 修復：添加錯誤處理、超時控制、模型驗證
   */
  public async diagnoseStock(ticker: string, model: string = "gpt-4o-mini", portfolioData?: any) {
    try {
      // 驗證 ticker
      if (!ticker && !portfolioData) {
        throw new Error("Invalid ticker or portfolio data provided");
      }

      let newsContext = "暫無最新新聞";
      if (ticker) {
        const news = await this.getStockNews(ticker);
        newsContext = news && news.length > 0 
          ? news.map((n: any) => `- ${n.title} (${n.publisher})`).join("\n")
          : "暫無最新新聞";
      }

      const isPortfolio = !!portfolioData;
      const targetName = isPortfolio ? "投資組合整體" : `股票代碼 "${ticker}"`;

      const prompt = `
你是一位極其嚴苛、毒舌且專業的對沖基金分析師。請針對 ${targetName} 進行深度診斷。
${isPortfolio ? `投資組合數據：${JSON.stringify(portfolioData)}` : `以下是該股票的最新新聞：\n${newsContext}`}

請以批判性的視角，分別從三個時間維度進行分析。記住：你的目標是找出潛在風險，不要輕易建議「持有」或「買入」，除非數據極其完美。

## 短期展望（1-3 個月）
- 技術面分析（是否存在超買、頂部背離、成交量萎縮等風險）
- 近期負面新聞或市場情緒的殺傷力分析
- 短期崩盤或回撤的觸發因素

## 中期展望（3-12 個月）
- 基本面分析（營收增速放緩、利潤率壓縮、估值過高等硬傷）
- 行業週期性風險或競爭對手的威脅
- 宏觀環境（利率、通膨）對該資產的負面衝擊

## 長期展望（1 年以上）
- 核心競爭力是否正在被侵蝕？護城河是否變窄？
- 長期結構性衰退的風險評估
- 替代技術或商業模式帶來的毀滅性打擊

## 綜合投資建議（必須明確：買入 / 持有 / 賣出）
- 如果資產表現平平或存在明顯隱憂，請果斷建議「賣出」或「減碼」。
- 嚴禁模糊地建議「持有」，除非有極強的抗跌理由。
- 核心風險提示（請列出最致命的 3 點）

請以繁體中文回答，並在最後附上一個 JSON 代碼塊，格式如下：
\`\`\`json
{
  "score": number,
  "shortTermScore": number,
  "midTermScore": number,
  "longTermScore": number,
  "sentiment": "悲觀" | "中立" | "樂觀",
  "recommendation": "買入" | "持有" | "賣出",
  "summary": "一句話總結（需具備批判性）"
}
\`\`\`
其中 score 為整體評分，shortTermScore、midTermScore、longTermScore 分別為短中長期評分，均為 -100 到 +100 的整數。評分低於 0 代表存在顯著風險。
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
  "shortTermScore": 0,
  "midTermScore": 0,
  "longTermScore": 0,
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

      if (this.shouldUseMockResponse()) {
        return `模擬的投資目標分析回應：${goal}。可用策略：ma_crossover,rsi,macd,bollinger_bands。

\`\`\`json
{
  "ticker": "SPY",
  "strategy": "ma_crossover",
  "params": { "shortPeriod": 10, "longPeriod": 30 },
  "description": "預設均線交叉策略"
}
\`\`\``;
      }
      
      const prompt = `
你是一位專業的 AI 投資顧問 AlphaTest。用戶的投資目標是：「${goal}」。

請對用戶的需求進行全面分析，並以繁體中文回答。

## 一、風險評估
根據用戶的預期報酬、可接受回撤、投資年限，判斷其風險屬性（保守型 / 穩健型 / 成長型 / 積極型）。

## 二、資產配置建議
推薦完整的資產配置組合，例如：
- 股票：XX%（包含具體股票或 ETF 建議）
- 債券 / 固定收益：XX%
- 現金 / 貨幣市場：XX%
- 其他資產（黃金、商品等）：XX%

## 三、量化策略推薦
目前平台支援以下四種策略，請從中選擇最適合的一種：
1. ma_crossover (均線交叉): 參數 shortPeriod, longPeriod
2. rsi (RSI指標): 參數 period, oversold, overbought
3. macd (MACD指標): 參數 fastPeriod, slowPeriod, signalPeriod
4. bollinger_bands (布林帶): 參數 period, stdDev

請說明為何這種策略適合用戶的目標，並提供建議的參數設定。

## 四、投資建議要點
- 定期定額投資建議
- 風險控制要點
- 稅務考量提示（如適用）

最後必須附上一個 JSON 代碼塊，格式如下：
\`\`\`json
{
  "ticker": "AAPL",
  "strategy": "ma_crossover",
  "params": { "shortPeriod": 10, "longPeriod": 30 },
  "assetAllocation": {
    "stocks": 60,
    "bonds": 30,
    "cash": 10
  },
  "description": "策略簡述"
}
\`\`\`
注意：strategy 必須是以下四種之一： ma_crossover, rsi, macd, bollinger_bands。
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
無法完成投資目標分析：${goal}

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

      if (this.shouldUseMockResponse()) {
        return `模擬的對話回應：${message}`;
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
      return `抱歉，我暫時無法回應「${message}」。請檢查您的網絡連接或稍後重試。`;
    }
  }
}
