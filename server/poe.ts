import { createParser } from 'eventsource-parser';

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
    // In a real scenario, this would prompt the AI to return a JSON strategy block.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`根據您的投資目標：「${goal}」，我為您量身打造了一個平衡型策略。

該策略結合了 **MA 交叉** 來捕捉趨勢，並使用 **RSI** 避免在超買區追高。這適合希望在穩定中尋求增長的投資者。

您可以點擊下方按鈕直接執行回測驗證：

\`\`\`json
{
  "ticker": "AAPL",
  "strategy": "ma_crossover,rsi",
  "params": {
    "shortPeriod": 10,
    "longPeriod": 30,
    "rsiPeriod": 14,
    "oversold": 35,
    "overbought": 65
  }
}
\`\`\``);
      }, 2000);
    });
  }

  public async chat(message: string, model: string): Promise<string> {
    console.log(`Chat message: "${message}" with model: ${model}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`AI 助理 (模型: ${model}) 對於「${message}」的回答：這是一個模擬的對話回應。如果您詢問有關策略的問題，我也可以為您生成可執行的回測參數。`);
      }, 1500);
    });
  }
}
