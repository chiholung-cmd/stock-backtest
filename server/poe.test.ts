import { describe, it, expect } from 'vitest';
import { PoeApiWrapper } from './poe';

describe('PoeApiWrapper', () => {
  const poe = new PoeApiWrapper('fake-key');

  it('should simulate analyzeGoal correctly', async () => {
    const goal = 'I want 15% return';
    const model = 'Claude-3-5-Sonnet';
    const result = await poe.analyzeGoal(goal, model);
    
    expect(result).toContain(goal);
    expect(result).toContain('ma_crossover,rsi');
    expect(result).toContain('```json');
  });

  it('should simulate chat correctly', async () => {
    const message = 'What is Sharpe ratio?';
    const model = 'GPT-4o';
    const result = await poe.chat(message, model);
    
    expect(result).toContain(message);
    expect(result).toContain('模擬的對話回應');
  });
});
