import { describe, it, expect, vi } from 'vitest';
import { logUsage, LogUsageParams } from '../usage';

describe('usage', () => {
  describe('logUsage', () => {
    it('should insert complete row with all required columns', () => {
      // Mock Supabase client
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });
      const mockSupabase = {
        from: mockFrom,
      } as any;

      const params: LogUsageParams = {
        userId: 'user-123',
        orgId: 'org-456',
        appId: 'scorecard',
        featureId: 'generate-rubric',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        tokensIn: 1000,
        tokensOut: 500,
        costUsd: 0.005,
        latencyMs: 1500,
        success: true,
        keySource: 'managed',
        supabase: mockSupabase,
      };

      // Call logUsage
      logUsage(params);

      // Give async operation time to fire
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(mockFrom).toHaveBeenCalledWith('ai_usage_log');
          expect(mockInsert).toHaveBeenCalledWith({
            user_id: 'user-123',
            org_id: 'org-456',
            app_id: 'scorecard',
            feature_id: 'generate-rubric',
            provider: 'anthropic',
            model: 'claude-sonnet-4-20250514',
            tokens_in: 1000,
            tokens_out: 500,
            cost_usd: 0.005,
            latency_ms: 1500,
            success: true,
            error_code: null,
            key_source: 'managed',
            created_at: expect.any(String),
          });
          resolve(undefined);
        }, 10);
      });
    });

    it('should handle error_code when provided on failure', () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });
      const mockSupabase = { from: mockFrom } as any;

      const params: LogUsageParams = {
        userId: 'user-123',
        appId: 'scorecard',
        featureId: 'classify-signal',
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        tokensIn: 100,
        tokensOut: 50,
        costUsd: 0.0001,
        latencyMs: 500,
        success: false,
        errorCode: 'RATE_LIMIT',
        keySource: 'managed',
        supabase: mockSupabase,
      };

      logUsage(params);

      return new Promise((resolve) => {
        setTimeout(() => {
          const call = mockInsert.mock.calls[0][0];
          expect(call.success).toBe(false);
          expect(call.error_code).toBe('RATE_LIMIT');
          resolve(undefined);
        }, 10);
      });
    });

    it('should fire-and-forget without awaiting', () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });
      const mockSupabase = { from: mockFrom } as any;

      const params: LogUsageParams = {
        userId: 'user-123',
        appId: 'scorecard',
        featureId: 'generate-rubric',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        tokensIn: 1000,
        tokensOut: 500,
        costUsd: 0.005,
        latencyMs: 1500,
        success: true,
        keySource: 'managed',
        supabase: mockSupabase,
      };

      // This should return immediately without waiting
      const result = logUsage(params);
      expect(result).toBeUndefined();
    });

    it('should catch and warn on error without throwing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const testError = new Error('Database insert failed');
      const mockInsert = vi.fn().mockRejectedValue(testError);
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });
      const mockSupabase = { from: mockFrom } as any;

      const params: LogUsageParams = {
        userId: 'user-123',
        appId: 'scorecard',
        featureId: 'generate-rubric',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        tokensIn: 1000,
        tokensOut: 500,
        costUsd: 0.005,
        latencyMs: 1500,
        success: true,
        keySource: 'managed',
        supabase: mockSupabase,
      };

      // Should not throw
      expect(() => logUsage(params)).not.toThrow();

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Failed to log AI usage:',
            testError
          );
          consoleWarnSpy.mockRestore();
          resolve(undefined);
        }, 10);
      });
    });
  });
});
