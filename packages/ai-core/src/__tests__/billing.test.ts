import { describe, it, expect, vi } from 'vitest';
import { getRemainingCredits, checkCredits } from '../billing';
import { InsufficientCreditsError } from '../errors';

describe('billing', () => {
  describe('getRemainingCredits', () => {
    it('should return current period balance when found', async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-123',
          credits_remaining_usd: '10.5000',
          credits_used_usd: '4.5000',
          spending_cap_usd: '20.0000',
          period_start: periodStart,
          period_end: periodEnd,
        },
        error: null,
      });

      const mockGt = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockLte = vi.fn().mockReturnValue({ gt: mockGt });
      const mockIs = vi.fn().mockReturnValue({ lte: mockLte });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi
        .fn()
        // First call: getUserOrgId returns null (not org member)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        // Second call: user balance query
        .mockReturnValueOnce({ select: mockSelect });

      const mockSupabase = { from: mockFrom };

      const result = await getRemainingCredits('user-123', mockSupabase as any);

      expect(result.remainingUsd).toBeCloseTo(10.5);
      expect(result.usedUsd).toBeCloseTo(4.5);
      expect(result.spendingCapUsd).toBeCloseTo(20);
      expect(result.periodStart).toBe(periodStart);
      expect(result.periodEnd).toBe(periodEnd);
    });

    it('should return zero balance when no active period found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockGt = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockLte = vi.fn().mockReturnValue({ gt: mockGt });
      const mockIs = vi.fn().mockReturnValue({ lte: mockLte });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi
        .fn()
        // First call: getUserOrgId returns null
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        // Second call: user balance query
        .mockReturnValueOnce({ select: mockSelect });

      const mockSupabase = { from: mockFrom };

      const result = await getRemainingCredits('user-123', mockSupabase as any);

      expect(result.remainingUsd).toBe(0);
      expect(result.usedUsd).toBe(0);
      expect(result.spendingCapUsd).toBeUndefined();
    });

    it('should parse credits_remaining_usd correctly', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-123',
          credits_remaining_usd: '0.0050',
          credits_used_usd: '99.9950',
          period_start: '2026-02-01T00:00:00Z',
          period_end: '2026-03-01T00:00:00Z',
        },
        error: null,
      });

      const mockGt = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockLte = vi.fn().mockReturnValue({ gt: mockGt });
      const mockIs = vi.fn().mockReturnValue({ lte: mockLte });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi
        .fn()
        // First call: getUserOrgId returns null
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        // Second call: user balance query
        .mockReturnValueOnce({ select: mockSelect });

      const mockSupabase = { from: mockFrom };

      const result = await getRemainingCredits('user-123', mockSupabase as any);

      expect(result.remainingUsd).toBeCloseTo(0.005, 5);
      expect(result.usedUsd).toBeCloseTo(99.995, 5);
    });
  });

  describe('checkCredits', () => {
    it('should not throw when balance sufficient', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-123',
          credits_remaining_usd: '10.0000',
          credits_used_usd: '0',
          period_start: '2026-02-01T00:00:00Z',
          period_end: '2026-03-01T00:00:00Z',
        },
        error: null,
      });

      const mockGt = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockLte = vi.fn().mockReturnValue({ gt: mockGt });
      const mockIs = vi.fn().mockReturnValue({ lte: mockLte });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi
        .fn()
        // First call: getUserOrgId returns null
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        // Second call: user balance query
        .mockReturnValueOnce({ select: mockSelect });

      const mockSupabase = { from: mockFrom };

      const result = await checkCredits('user-123', 5.0, mockSupabase as any);
      expect(result).toBe(true);
    });

    it('should throw InsufficientCreditsError when balance too low', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-123',
          credits_remaining_usd: '2.0000',
          credits_used_usd: '0',
          period_start: '2026-02-01T00:00:00Z',
          period_end: '2026-03-01T00:00:00Z',
        },
        error: null,
      });

      const mockGt = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockLte = vi.fn().mockReturnValue({ gt: mockGt });
      const mockIs = vi.fn().mockReturnValue({ lte: mockLte });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi
        .fn()
        // First call: getUserOrgId returns null
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        // Second call: user balance query
        .mockReturnValueOnce({ select: mockSelect });

      const mockSupabase = { from: mockFrom };

      await expect(checkCredits('user-123', 5.0, mockSupabase as any)).rejects.toThrow(
        InsufficientCreditsError,
      );
    });

    it('should throw when no credits and balance zero', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockGt = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockLte = vi.fn().mockReturnValue({ gt: mockGt });
      const mockIs = vi.fn().mockReturnValue({ lte: mockLte });
      const mockEq = vi.fn().mockReturnValue({ is: mockIs });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi
        .fn()
        // First call: getUserOrgId returns null
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        // Second call: user balance query
        .mockReturnValueOnce({ select: mockSelect });

      const mockSupabase = { from: mockFrom };

      await expect(checkCredits('user-123', 0.01, mockSupabase as any)).rejects.toThrow(
        InsufficientCreditsError,
      );
    });
  });
});
