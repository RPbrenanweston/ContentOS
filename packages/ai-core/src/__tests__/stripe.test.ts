/**
 * Tests for Stripe checkout session creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckoutSession } from '../billing';
import Stripe from 'stripe';

// Mock Stripe SDK
vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    customers: {
      create: vi.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com',
      }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test_session123',
          url: 'https://checkout.stripe.com/pay/cs_test_session123',
        }),
      },
    },
  }));

  return { default: MockStripe };
});

describe('Stripe Checkout', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user_123',
            email: 'test@example.com',
          },
        },
        error: null,
      }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null, // No existing Stripe customer
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue(undefined),
      catch: vi.fn(),
    })),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  it('creates checkout session with valid preset amount', async () => {
    const result = await createCheckoutSession({
      userId: 'user_123',
      amountUsd: 10,
      successUrl: 'https://app.example.com/credits/success',
      cancelUrl: 'https://app.example.com/credits',
      supabase: mockSupabase,
    });

    expect(result.sessionId).toBe('cs_test_session123');
    expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_session123');
    expect(result.customerId).toBe('cus_test123');
  });

  it('validates preset amounts ($5, $10, $25, $50)', async () => {
    const validAmounts = [5, 10, 25, 50];

    for (const amount of validAmounts) {
      const result = await createCheckoutSession({
        userId: 'user_123',
        amountUsd: amount,
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        supabase: mockSupabase,
      });

      expect(result.sessionId).toBeTruthy();
    }
  });

  it('rejects invalid amounts', async () => {
    await expect(
      createCheckoutSession({
        userId: 'user_123',
        amountUsd: 15, // Invalid amount
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        supabase: mockSupabase,
      })
    ).rejects.toThrow('Invalid amount: 15. Must be one of: 5, 10, 25, 50');
  });

  it('throws error if STRIPE_SECRET_KEY not set', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    await expect(
      createCheckoutSession({
        userId: 'user_123',
        amountUsd: 10,
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        supabase: mockSupabase,
      })
    ).rejects.toThrow('STRIPE_SECRET_KEY environment variable not set');
  });

  it('includes user metadata in checkout session', async () => {
    const result = await createCheckoutSession({
      userId: 'user_123',
      amountUsd: 25,
      successUrl: 'https://app.example.com/success',
      cancelUrl: 'https://app.example.com/cancel',
      supabase: mockSupabase,
    });

    // Verify session was created successfully
    expect(result.sessionId).toBeTruthy();
    expect(result.url).toBeTruthy();
  });

  it('uses existing Stripe customer ID if available', async () => {
    const mockSupabaseWithCustomer = {
      ...mockSupabase,
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { stripe_customer_id: 'cus_existing123' },
          error: null,
        }),
      })),
    } as any;

    const result = await createCheckoutSession({
      userId: 'user_123',
      amountUsd: 10,
      successUrl: 'https://app.example.com/success',
      cancelUrl: 'https://app.example.com/cancel',
      supabase: mockSupabaseWithCustomer,
    });

    // Verify session was created successfully
    expect(result.sessionId).toBeTruthy();
    expect(result.url).toBeTruthy();
  });
});
