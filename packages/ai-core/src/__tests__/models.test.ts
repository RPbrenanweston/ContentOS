import { describe, it, expect } from 'vitest';
import { calculateCost } from '../models';
import { ModelInfo } from '../types';

describe('models', () => {
  describe('calculateCost', () => {
    const mockModel: ModelInfo = {
      id: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      displayName: 'Claude Sonnet 4',
      costPerInputToken: 0.000003,
      costPerOutputToken: 0.000015,
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      isDefault: true,
      isActive: true,
    };

    it('should calculate cost correctly for basic input', () => {
      const cost = calculateCost(mockModel, 100, 50);
      // (100 * 0.000003) + (50 * 0.000015) = 0.0003 + 0.00075 = 0.00105
      expect(cost).toBeCloseTo(0.00105, 8);
    });

    it('should calculate cost for zero tokens', () => {
      const cost = calculateCost(mockModel, 0, 0);
      expect(cost).toBe(0);
    });

    it('should calculate cost for large token counts', () => {
      const cost = calculateCost(mockModel, 100000, 8000);
      // (100000 * 0.000003) + (8000 * 0.000015) = 0.3 + 0.12 = 0.42
      expect(cost).toBeCloseTo(0.42, 8);
    });

    it('should handle Haiku model with lower costs', () => {
      const haikuModel: ModelInfo = {
        ...mockModel,
        id: 'claude-haiku-4-5-20251001',
        displayName: 'Claude Haiku 4.5',
        costPerInputToken: 0.0000008,
        costPerOutputToken: 0.000004,
      };

      const cost = calculateCost(haikuModel, 1000, 100);
      // (1000 * 0.0000008) + (100 * 0.000004) = 0.0008 + 0.0004 = 0.0012
      expect(cost).toBeCloseTo(0.0012, 8);
    });
  });
});
