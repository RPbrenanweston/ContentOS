import { describe, it, expect } from 'vitest';
import { createAIClient, AIError } from '../src/index';

describe('@org/ai-core', () => {
  it('exports createAIClient function', () => {
    expect(typeof createAIClient).toBe('function');
  });

  it('exports AIError class', () => {
    expect(AIError).toBeDefined();
  });
});
