/**
 * Tests for spending cap enforcement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkSpendingCap, deductCredits } from '../billing';
import { SpendingCapExceededError } from '../errors';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Spending Cap Enforcement', () => {
  let mockSupabase: any;
  let mockMaybeSingle: any;
  let mockUpdate: any;
  let mockEq: any;

  beforeEach(() => {
    // Create mock functions for the query chain
    mockMaybeSingle = vi.fn();
    mockEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate = vi.fn(() => ({ eq: mockEq }));

    // Create mock Supabase client with proper chain
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({  // Add .is() support for user-level queries
              lte: vi.fn(() => ({
                gt: vi.fn(() => ({
                  maybeSingle: mockMaybeSingle
                }))
              }))
            })),
            lte: vi.fn(() => ({
              gt: vi.fn(() => ({
                maybeSingle: mockMaybeSingle
              }))
            })),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })  // For getUserOrgId
          }))
        })),
        update: mockUpdate
      }))
    };
  });

  describe('checkSpendingCap', () => {
    it('AC1: allows call when no cap configured', async () => {
      // Mock: no balance row exists (no caps)
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      await expect(
        checkSpendingCap('user-123', 0.50, mockSupabase)
      ).resolves.toBeUndefined();
    });

    it('AC2: allows call when balance row exists but no caps set', async () => {
      // Mock: balance row exists but spending_cap_usd and admin_cap_usd are null
      mockMaybeSingle.mockResolvedValue({
        data: {
          credits_used_usd: '5.0000',
          credits_remaining_usd: '10.0000',
          spending_cap_usd: null,
          admin_cap_usd: null
        },
        error: null
      });

      await expect(
        checkSpendingCap('user-123', 0.50, mockSupabase)
      ).resolves.toBeUndefined();
    });

    it('AC3: enforces user cap when only user cap set', async () => {
      // Mock: user cap = 10.00, used = 9.60, trying to spend 0.50 (would exceed)
      mockMaybeSingle.mockResolvedValue({
        data: {
          credits_used_usd: '9.6000',
          credits_remaining_usd: '0.4000',
          spending_cap_usd: '10.0000',
          admin_cap_usd: null
        },
        error: null
      });

      await expect(
        checkSpendingCap('user-123', 0.50, mockSupabase)
      ).rejects.toThrow(SpendingCapExceededError);
    });

    it('AC4: allows call when under user cap', async () => {
      // Mock: user cap = 10.00, used = 9.00, trying to spend 0.50 (OK)
      mockMaybeSingle.mockResolvedValue({
        data: {
          credits_used_usd: '9.0000',
          credits_remaining_usd: '1.0000',
          spending_cap_usd: '10.0000',
          admin_cap_usd: null
        },
        error: null
      });

      await expect(
        checkSpendingCap('user-123', 0.50, mockSupabase)
      ).resolves.toBeUndefined();
    });

    it('AC5: enforces admin cap when only admin cap set', async () => {
      // Mock: admin cap = 5.00, used = 4.80, trying to spend 0.30 (would exceed)
      mockMaybeSingle.mockResolvedValue({
        data: {
          credits_used_usd: '4.8000',
          credits_remaining_usd: '0.2000',
          spending_cap_usd: null,
          admin_cap_usd: '5.0000'
        },
        error: null
      });

      await expect(
        checkSpendingCap('user-123', 0.30, mockSupabase)
      ).rejects.toThrow(SpendingCapExceededError);
    });

    it('AC6: lower of user and admin cap wins (user lower)', async () => {
      // Mock: user cap = 5.00, admin cap = 10.00, used = 4.80, trying to spend 0.30
      // Should enforce user cap (5.00), which would be exceeded
      mockMaybeSingle.mockResolvedValue({
        data: {
          credits_used_usd: '4.8000',
          credits_remaining_usd: '0.2000',
          spending_cap_usd: '5.0000',
          admin_cap_usd: '10.0000'
        },
        error: null
      });

      await expect(
        checkSpendingCap('user-123', 0.30, mockSupabase)
      ).rejects.toThrow(SpendingCapExceededError);
    });

    it('AC7: lower of user and admin cap wins (admin lower)', async () => {
      // Mock: user cap = 10.00, admin cap = 5.00, used = 4.80, trying to spend 0.30
      // Should enforce admin cap (5.00), which would be exceeded
      mockMaybeSingle.mockResolvedValue({
        data: {
          credits_used_usd: '4.8000',
          credits_remaining_usd: '0.2000',
          spending_cap_usd: '10.0000',
          admin_cap_usd: '5.0000'
        },
        error: null
      });

      await expect(
        checkSpendingCap('user-123', 0.30, mockSupabase)
      ).rejects.toThrow(SpendingCapExceededError);
    });

    it('AC8: allows call when both caps set and under limit', async () => {
      // Mock: user cap = 10.00, admin cap = 5.00, used = 3.00, trying to spend 0.50
      // Effective cap = 5.00 (admin lower), 3.00 + 0.50 = 3.50 < 5.00 (OK)
      mockMaybeSingle.mockResolvedValue({
        data: {
          credits_used_usd: '3.0000',
          credits_remaining_usd: '2.0000',
          spending_cap_usd: '10.0000',
          admin_cap_usd: '5.0000'
        },
        error: null
      });

      await expect(
        checkSpendingCap('user-123', 0.50, mockSupabase)
      ).resolves.toBeUndefined();
    });
  });

  describe('deductCredits', () => {
    it('AC9: increments credits_used_usd after successful call', async () => {
      // Mock select query
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'balance-123',
          credits_used_usd: '5.0000',
          credits_remaining_usd: '10.0000'
        },
        error: null
      });

      await deductCredits('user-123', 0.50, mockSupabase);

      // Verify update was called with incremented credits_used_usd
      expect(mockUpdate).toHaveBeenCalledWith({
        credits_used_usd: 5.50,
        credits_remaining_usd: 9.50
      });
    });

    it('AC10: decrements credits_remaining_usd after successful call', async () => {
      // Mock select query
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'balance-123',
          credits_used_usd: '5.0000',
          credits_remaining_usd: '10.0000'
        },
        error: null
      });

      await deductCredits('user-123', 0.50, mockSupabase);

      // Verify update was called with decremented credits_remaining_usd
      expect(mockUpdate).toHaveBeenCalledWith({
        credits_used_usd: 5.50,
        credits_remaining_usd: 9.50
      });
    });

    it('AC11: does not go negative on credits_remaining_usd', async () => {
      // Mock: only 0.30 remaining, trying to deduct 0.50
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'balance-123',
          credits_used_usd: '9.7000',
          credits_remaining_usd: '0.3000'
        },
        error: null
      });

      await deductCredits('user-123', 0.50, mockSupabase);

      // Verify credits_remaining_usd is floored at 0
      expect(mockUpdate).toHaveBeenCalledWith({
        credits_used_usd: 10.20,
        credits_remaining_usd: 0
      });
    });

    it('AC12: handles no balance row gracefully', async () => {
      // Mock: no balance row exists
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      // Should not throw, just return
      await expect(
        deductCredits('user-123', 0.50, mockSupabase)
      ).resolves.toBeUndefined();

      // Verify update was NOT called
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
