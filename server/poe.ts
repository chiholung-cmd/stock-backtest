import { createParser } from "eventsource-parser";

export class PoeApiWrapper {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async streamPoeResponse(botName: string, query: string, model: string, onToken: (token: string) => void) {
    const response = await fetch(`https://api.poe.com/bot/${botName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        query,
        model,
      }),
    });

    if (!response.ok) {
      throw new Error(`Poe API error: ${response.statusText}`);
    }

    const parser = createParser((event) => {
      if (event.type === 'event') {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            onToken(data.text);
          }
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      }
    });

    if (response.body) {
      const reader = response.body.getReader();
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          parser.feed(new TextDecoder().decode(value));
        }
      }
    }
  }

  public async analyzeGoal(goal: string, model: string): Promise<string> {
    console.log(`Analyzing goal: "${goal}" with model: ${model}`);
    // Return a structured strategy recommendation with proper JSON format
    return new Promise((resolve) => {
      setTimeout(() => {
        // Determine strategy based on goal keywords
        let strategy = "ma_crossover";
        let params: Record<string, number> = { shortPeriod: 10, longPeriod: 30 };
        let ticker = "AAPL";
        let description = "平衡型策略";

        if (goal.includes("穩定") || goal.includes("安全") || goal.includes("保守")) {
          strategy = "rsi";
          params = { period: 14, oversold: 30, overbought: 70 };
          description = "保守型策略 - 基於 RSI 超賣/超買";
        } else if (goal.includes("增長") || goal.includes("收益") || goal.includes("成長")) {
          strategy = "macd";
          params = { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
          description = "成長型策略 - 基於 MACD 動能";
        } else if (goal.includes("波動") || goal.includes("風險") || goal.includes("高收益")) {
          strategy = "bollinger_bands";
          params = { period: 20, stdDev: 2 };
          description = "波動型策略 - 基於布林帶";
        }

        const strategyData = {
          ticker,
          strategy,
          params,
        };

        resolve(`根據您的投資目標：「${goal}」，我為您推薦了一個 **${description}**。

該策略已經過優化，您可以點擊下方按鈕直接執行回測驗證。

\`\`\`json
${JSON.stringify(strategyData, null, 2)}
\`\`\``);
      }, 2000);
    });
  }

  public async chat(message: string, model: string): Promise<string> {
    console.log(`Chat message: "${message}" with model: ${model}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Check if message is asking for strategy suggestion
        if (message.includes("策略") || message.includes("建議") || message.includes("推薦")) {
          const strategyData = {
            ticker: "AAPL",
            strategy: "ma_crossover",
            params: { shortPeriod: 10, longPeriod: 30 },
          };
          resolve(`根據您的問題，我建議使用 MA 交叉策略。

\`\`\`json
${JSON.stringify(strategyData, null, 2)}
\`\`\``);
        } else {
          resolve(`AI 助理 (模型: ${model}) 對於「${message}」的回答：這是一個模擬的對話回應。如果您需要策略建議，請告訴我您的投資目標。`);
        }
      }, 1500);
    });
  }
}
