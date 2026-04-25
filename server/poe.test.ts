import { describe, it, expect } from 'vitest';
import { PoeApiWrapper } from './poe';

describe('PoeApiWrapper', () => {
  const poe = new PoeApiWrapper('test-api-key');

  it('should simulate analyzeGoal correctly', async () => {
    const goal = 'I want 15% return';
    const model = 'Claude-3-5-Sonnet';
    const result = await poe.analyzeGoal(goal, model);
    
    expect(result).toContain(goal);
    expect(result).toContain(model);
    expect(result).toContain('Recommended stock combination');
  });

  it('should simulate chat correctly', async () => {
    const message = 'What is Sharpe ratio?';
    const model = 'GPT-4o';
    const result = await poe.chat(message, model);
    
    expect(result).toContain(message);
    expect(result).toContain(model);
    expect(result).toContain('This is a simulated chat response');
  });
});
