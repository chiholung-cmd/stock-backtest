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

    // Assuming response.body is a ReadableStream
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
    // This is a placeholder. In a real scenario, this would call a Poe bot
    // specifically designed for goal analysis and return a structured response.
    // For now, it will simulate a response.
    console.log(`Analyzing goal: "${goal}" with model: ${model}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Based on your goal: "${goal}" and using model ${model}, here's a simulated analysis:\n\nRecommended stock combination: [AAPL, MSFT, GOOGL] with rationale.\nRecommended strategy for each stock: [Strategy A for AAPL, Strategy B for MSFT, Strategy C for GOOGL].\nSuggested parameter settings: [Simulated parameters].`);
      }, 2000);
    });
  }

  public async chat(message: string, model: string): Promise<string> {
    // This is a placeholder. In a real scenario, this would call a Poe chat bot.
    console.log(`Chat message: "${message}" with model: ${model}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`AI Assistant (model: ${model}) response to "${message}": This is a simulated chat response.`);
      }, 1500);
    });
  }
}

// Example usage (for testing purposes, not part of the main export)
// async function testPoeApi() {
//   const poe = new PoeApiWrapper(process.env.POE_API_KEY || 'YOUR_POE_API_KEY');
//   console.log('Testing analyzeGoal...');
//   const goalAnalysis = await poe.analyzeGoal('I am 35 years old, want 15% annual return, moderate risk tolerance, investment horizon 5 years', 'Claude-3-5-Sonnet');
//   console.log(goalAnalysis);

//   console.log('\nTesting chat...');
//   const chatResponse = await poe.chat('What is Sharpe ratio?', 'GPT-4o');
//   console.log(chatResponse);
// }

// testPoeApi();
