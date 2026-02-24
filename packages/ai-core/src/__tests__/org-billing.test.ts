/**
 * Org-level billing tests
 *
 * Tests for S25: org-level credit balances, shared pools, and admin caps
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getUserOrgId,
  getOrgBalance,
  getRemainingCredits,
  checkSpendingCap,
  deductCredits,
  createCheckoutSession,
  handleStripeWebhook,
} from '../billing';
import { SpendingCapExceededError } from '../errors';

// Mock Supabase client
const createMockSupabase = () => {
  // Shared mocks that tests can configure
  const mockMaybeSingle = vi.fn();
  const mockInsert = vi.fn();

  // Separate update mock for the actual update call (not exposed to tests)
  const mockUpdateCall = vi.fn();

  // Create flexible from() that can handle different table mocking
  const mockFrom = vi.fn((table: string) => {
    // Circular reference setup for complex query chains
    const mockGt = vi.fn();
    const mockLte = vi.fn();
    const mockIs = vi.fn();
    const mockEq = vi.fn();
    const mockSelect = vi.fn();

    // Setup chain relationships
    mockGt.mockReturnValue({ maybeSingle: mockMaybeSingle, eq: mockEq, is: mockIs });
    mockLte.mockReturnValue({ gt: mockGt });
    mockIs.mockReturnValue({ lte: mockLte, maybeSingle: mockMaybeSingle, eq: mockEq });
    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      lte: mockLte,
      maybeSingle: mockMaybeSingle,
      select: mockSelect,
      single: vi.fn().mockResolvedValue({ data: null, error: null }),  // For users table query
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      lte: mockLte,  // Add .lte() directly after .select() for webhook pattern
    });

    // Update chain that resolves to promise
    const mockUpdateEq = vi.fn(() => Promise.resolve({ error: null }));
    const mockUpdateChain = vi.fn((data: any) => {
      mockUpdateCall(data);  // Capture the update data
      return { eq: mockUpdateEq };
    });

    return {
      select: mockSelect,
      update: mockUpdateChain,
      insert: mockInsert,
    };
  });

  return {
    from: mockFrom,
    auth: {
      getUser: vi.fn(),
    },
    mocks: {
      from: mockFrom,
      maybeSingle: mockMaybeSingle,
      update: mockUpdateCall,  // Expose the actual update call, not the chain
      insert: mockInsert,
    },
  } as any;
};

// Mock Stripe module
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: vi.fn().mockResolvedValue({
          id: 'cus_test123',
        }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test123',
            url: 'https://checkout.stripe.com/test',
          }),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    })),
  };
});

describe('Org-Level Billing', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    vi.clearAllMocks();

    // Set environment variables for Stripe tests
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
  });

  describe('getUserOrgId', () => {
    it('returns org_id when user is org member', async () => {
      mockSupabase.mocks.maybeSingle.mockResolvedValue({
        data: { org_id: 'org_abc123' },
        error: null,
      });

      const result = await getUserOrgId('user_123', mockSupabase);

      expect(result).toBe('org_abc123');
      expect(mockSupabase.from).toHaveBeenCalledWith('org_members');
    });

    it('returns null when user is not org member', async () => {
      mockSupabase.mocks.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getUserOrgId('user_123', mockSupabase);

      expect(result).toBeNull();
    });
  });

  describe('getOrgBalance', () => {
    it('returns org-level credit balance', async () => {
      mockSupabase.mocks.maybeSingle.mockResolvedValue({
        data: {
          org_id: 'org_abc123',
          user_id: null,
          credits_remaining_usd: '100.0000',
          credits_used_usd: '25.5000',
          admin_cap_usd: '500.0000',
          period_start: '2026-02-01T00:00:00Z',
          period_end: '2026-02-28T23:59:59Z',
        },
        error: null,
      });

      const result = await getOrgBalance('org_abc123', mockSupabase);

      expect(result).toEqual({
        remainingUsd: 100,
        usedUsd: 25.5,
        spendingCapUsd: 500,
        periodStart: '2026-02-01T00:00:00Z',
        periodEnd: '2026-02-28T23:59:59Z',
        orgId: 'org_abc123',
      });
    });

    it('returns zero balance when no org balance exists', async () => {
      mockSupabase.mocks.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getOrgBalance('org_abc123', mockSupabase);

      expect(result.remainingUsd).toBe(0);
      expect(result.usedUsd).toBe(0);
    });
  });

  describe('getRemainingCredits (with org membership)', () => {
    it('returns org balance when user is org member', async () => {
      // First call: getUserOrgId returns org_id
      mockSupabase.mocks.maybeSingle
        .mockResolvedValueOnce({
          data: { org_id: 'org_abc123' },
          error: null,
        })
        // Second call: getOrgBalance query
        .mockResolvedValueOnce({
          data: {
            org_id: 'org_abc123',
            user_id: null,
            credits_remaining_usd: '200.0000',
            credits_used_usd: '50.0000',
            admin_cap_usd: '1000.0000',
            period_start: '2026-02-01T00:00:00Z',
            period_end: '2026-02-28T23:59:59Z',
          },
          error: null,
        });

      const result = await getRemainingCredits('user_123', mockSupabase);

      expect(result.remainingUsd).toBe(200);
      expect(result.orgId).toBe('org_abc123');
    });

    it('returns user balance when user is not org member', async () => {
      // First call: getUserOrgId returns null
      mockSupabase.mocks.maybeSingle
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        // Second call: user balance query
        .mockResolvedValueOnce({
          data: {
            user_id: 'user_123',
            org_id: null,
            credits_remaining_usd: '75.0000',
            credits_used_usd: '10.0000',
            spending_cap_usd: '100.0000',
            period_start: '2026-02-01T00:00:00Z',
            period_end: '2026-02-28T23:59:59Z',
          },
          error: null,
        });

      const result = await getRemainingCredits('user_123', mockSupabase);

      expect(result.remainingUsd).toBe(75);
      expect(result.spendingCapUsd).toBe(100);
      expect(result.orgId).toBeUndefined();
    });
  });

  describe('checkSpendingCap (org admin cap override)', () => {
    it('enforces org admin cap for org members', async () => {
      // getUserOrgId returns org_id
      mockSupabase.mocks.maybeSingle
        .mockResolvedValueOnce({
          data: { org_id: 'org_abc123' },
          error: null,
        })
        // checkSpendingCap org balance query
        .mockResolvedValueOnce({
          data: {
            org_id: 'org_abc123',
            user_id: null,
            credits_used_usd: '450.0000',
            admin_cap_usd: '500.0000',
            spending_cap_usd: null, // User caps ignored for orgs
          },
          error: null,
        });

      // This should pass: 450 + 30 = 480 < 500
      await expect(
        checkSpendingCap('user_123', 30, mockSupabase)
      ).resolves.toBeUndefined();
    });

    it('throws when org admin cap exceeded', async () => {
      // getUserOrgId returns org_id
      mockSupabase.mocks.maybeSingle
        .mockResolvedValueOnce({
          data: { org_id: 'org_abc123' },
          error: null,
        })
        // checkSpendingCap org balance query
        .mockResolvedValueOnce({
          data: {
            org_id: 'org_abc123',
            user_id: null,
            credits_used_usd: '480.0000',
            admin_cap_usd: '500.0000',
            spending_cap_usd: null,
          },
          error: null,
        });

      // This should fail: 480 + 30 = 510 > 500
      await expect(
        checkSpendingCap('user_123', 30, mockSupabase)
      ).rejects.toThrow(SpendingCapExceededError);
    });
  });

  describe('deductCredits (from org pool)', () => {
    it('deducts from org balance when user is org member', async () => {
      // getUserOrgId returns org_id
      mockSupabase.mocks.maybeSingle
        .mockResolvedValueOnce({
          data: { org_id: 'org_abc123' },
          error: null,
        })
        // deductCredits org balance query
        .mockResolvedValueOnce({
          data: {
            id: 'balance_org_123',
            org_id: 'org_abc123',
            user_id: null,
            credits_used_usd: '100.0000',
            credits_remaining_usd: '400.0000',
          },
          error: null,
        });

      await deductCredits('user_123', 5.50, mockSupabase);

      expect(mockSupabase.mocks.update).toHaveBeenCalledWith({
        credits_used_usd: 105.5,
        credits_remaining_usd: 394.5,
      });
    });

    it('deducts from user balance when not org member', async () => {
      // getUserOrgId returns null
      mockSupabase.mocks.maybeSingle
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        // deductCredits user balance query
        .mockResolvedValueOnce({
          data: {
            id: 'balance_user_123',
            user_id: 'user_123',
            org_id: null,
            credits_used_usd: '20.0000',
            credits_remaining_usd: '80.0000',
          },
          error: null,
        });

      await deductCredits('user_123', 3.25, mockSupabase);

      expect(mockSupabase.mocks.update).toHaveBeenCalledWith({
        credits_used_usd: 23.25,
        credits_remaining_usd: 76.75,
      });
    });
  });

  describe('Stripe checkout with org', () => {
    it('creates checkout session for org credit purchase', async () => {
      const Stripe = (await import('stripe')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
      });

      // Get the mock Stripe constructor
      const StripeConstructor = Stripe as any;
      // Replace the mock implementation to capture calls
      StripeConstructor.mockImplementation(() => ({
        customers: {
          create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
        },
        checkout: {
          sessions: {
            create: mockCreate,
          },
        },
        webhooks: {
          constructEvent: vi.fn(),
        },
      }));

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'admin@example.com' } },
        error: null,
      });

      // User lookup returns no existing Stripe customer
      mockSupabase.mocks.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await createCheckoutSession({
        userId: 'user_admin',
        amountUsd: 50,
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        supabase: mockSupabase,
        orgId: 'org_abc123', // Org-level purchase
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            org_id: 'org_abc123',
            supabase_user_id: 'user_admin',
            credit_amount_usd: '50',
          }),
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                product_data: expect.objectContaining({
                  name: 'Org AI Credits - $50',
                }),
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('Stripe webhook with org credit', () => {
    it('credits org balance when org_id in metadata', async () => {
      const Stripe = (await import('stripe')).default;
      const mockConstructEvent = vi.fn();

      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_org_purchase',
            metadata: {
              supabase_user_id: 'user_admin',
              credit_amount_usd: '100',
              org_id: 'org_abc123',
            },
            payment_status: 'paid',
          },
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);

      // Replace the Stripe mock to use our constructEvent mock
      const StripeConstructor = Stripe as any;
      StripeConstructor.mockImplementation(() => ({
        customers: {
          create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
        },
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test123',
              url: 'https://checkout.stripe.com/test',
            }),
          },
        },
        webhooks: {
          constructEvent: mockConstructEvent,
        },
      }));

      // Idempotency check (no existing log)
      mockSupabase.mocks.maybeSingle
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        // Org balance query (existing balance)
        .mockResolvedValueOnce({
          data: {
            id: 'balance_org_123',
            org_id: 'org_abc123',
            user_id: null,
            credits_remaining_usd: '500.0000',
          },
          error: null,
        });

      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

      const result = await handleStripeWebhook('raw_body', 'signature', mockSupabase);

      expect(result.status).toBe(200);
      expect(mockSupabase.mocks.update).toHaveBeenCalledWith({
        credits_remaining_usd: 600,
      });
    });
  });
});
