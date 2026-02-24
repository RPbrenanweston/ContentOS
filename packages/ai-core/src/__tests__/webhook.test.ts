/**
 * Tests for Stripe webhook handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleStripeWebhook } from '../billing';
import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Mock Stripe module
vi.mock('stripe', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: vi.fn(),
    },
  };
  return {
    default: vi.fn(() => mockStripe),
  };
});

describe('handleStripeWebhook', () => {
  let mockSupabase: SupabaseClient;
  let mockStripe: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          lte: vi.fn(() => ({  // .lte() can be called directly after .select()
            gt: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          })),
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            lte: vi.fn(() => ({
              gt: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          // Supabase insert returns the query builder, not a promise directly
          then: (resolve: any) => resolve({ data: null, error: null }),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: (resolve: any) => resolve({ data: null, error: null }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    // Get mock Stripe instance (already mocked at module level)
    mockStripe = new Stripe('sk_test_123', { apiVersion: '2026-01-28.clover' });
  });

  it('should reject webhook with invalid signature', async () => {
    // Mock signature verification failure
    (mockStripe.webhooks.constructEvent as any).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const result = await handleStripeWebhook(
      'raw body',
      'invalid_signature',
      mockSupabase
    );

    expect(result.status).toBe(400);
    expect(result.message).toContain('Webhook signature verification failed');
  });

  it('should process checkout.session.completed event and credit balance', async () => {
    // Mock valid event
    const mockEvent: Stripe.Event = {
      id: 'evt_test_123',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: {
            supabase_user_id: 'user_123',
            credit_amount_usd: '25',
          },
          payment_status: 'paid',
        } as Stripe.Checkout.Session,
      },
    } as Stripe.Event;

    (mockStripe.webhooks.constructEvent as any).mockReturnValue(mockEvent);

    // Mock no existing payment log (first time processing)
    const selectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }));

    // Mock no existing balance row
    const balanceSelectMock = vi.fn(() => ({
      lte: vi.fn(() => ({  // Support .select().lte() for webhook pattern
        gt: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      eq: vi.fn(() => ({
        lte: vi.fn(() => ({
          gt: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    }));

    const insertMock = vi.fn(() => Promise.resolve({ data: null, error: null }));

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'stripe_payment_logs') {
        return {
          select: selectMock,
          insert: insertMock,
        };
      }
      if (table === 'ai_credit_balances') {
        return {
          select: balanceSelectMock,
          insert: insertMock,
        };
      }
      return { select: vi.fn(), insert: vi.fn() };
    }) as any;

    const result = await handleStripeWebhook(
      'raw body',
      'valid_signature',
      mockSupabase
    );

    expect(result.status).toBe(200);
    expect(result.message).toContain('Credited 25 USD');
    expect(insertMock).toHaveBeenCalledTimes(2); // One for balance, one for payment log
  });

  it('should handle idempotency - skip processing if session already logged', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test_123',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: {
            supabase_user_id: 'user_123',
            credit_amount_usd: '25',
          },
          payment_status: 'paid',
        } as Stripe.Checkout.Session,
      },
    } as Stripe.Event;

    (mockStripe.webhooks.constructEvent as any).mockReturnValue(mockEvent);

    // Mock existing payment log (already processed)
    const selectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'log_123', session_id: 'cs_test_123' },
          error: null,
        }),
      })),
    }));

    const insertMock = vi.fn();

    mockSupabase.from = vi.fn((table: string) => ({
      select: selectMock,
      insert: insertMock,
    })) as any;

    const result = await handleStripeWebhook(
      'raw body',
      'valid_signature',
      mockSupabase
    );

    expect(result.status).toBe(200);
    expect(result.message).toContain('already processed');
    expect(insertMock).not.toHaveBeenCalled(); // No insert - idempotent
  });

  it('should update existing balance row if period already exists', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test_123',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_456',
          metadata: {
            supabase_user_id: 'user_123',
            credit_amount_usd: '10',
          },
          payment_status: 'paid',
        } as Stripe.Checkout.Session,
      },
    } as Stripe.Event;

    (mockStripe.webhooks.constructEvent as any).mockReturnValue(mockEvent);

    // Mock existing balance row
    const balanceRow = {
      id: 'balance_123',
      user_id: 'user_123',
      credits_remaining_usd: '15.50',
      credits_used_usd: '4.50',
    };

    const selectMock = vi.fn((columns: string) => {
      if (columns === 'id') {
        // Payment log query - return null (not yet processed)
        return {
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }
      // Balance query - return existing row
      return {
        lte: vi.fn(() => ({  // Support .select().lte() for webhook pattern
          gt: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: balanceRow, error: null }),
              })),
            })),
            maybeSingle: vi.fn().mockResolvedValue({ data: balanceRow, error: null }),
          })),
        })),
        eq: vi.fn(() => ({
          lte: vi.fn(() => ({
            gt: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: balanceRow, error: null }),
            })),
          })),
        })),
      };
    });

    const updateMock = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    }));

    const insertMock = vi.fn(() => Promise.resolve({ data: null, error: null }));

    mockSupabase.from = vi.fn((table: string) => ({
      select: selectMock,
      update: updateMock,
      insert: insertMock,
    })) as any;

    const result = await handleStripeWebhook(
      'raw body',
      'valid_signature',
      mockSupabase
    );

    expect(result.status).toBe(200);
    expect(updateMock).toHaveBeenCalled(); // Update called, not insert
    expect(insertMock).toHaveBeenCalledTimes(1); // Only payment log insert
  });

  it('should return 200 for unknown event types', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test_123',
      object: 'event',
      type: 'customer.created',
      data: {
        object: {} as any,
      },
    } as Stripe.Event;

    (mockStripe.webhooks.constructEvent as any).mockReturnValue(mockEvent);

    const result = await handleStripeWebhook(
      'raw body',
      'valid_signature',
      mockSupabase
    );

    expect(result.status).toBe(200);
    expect(result.message).toContain('Unhandled event type');
  });

  it('should return 400 if metadata is missing', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test_123',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: {}, // Missing required metadata
          payment_status: 'paid',
        } as Stripe.Checkout.Session,
      },
    } as Stripe.Event;

    (mockStripe.webhooks.constructEvent as any).mockReturnValue(mockEvent);

    const result = await handleStripeWebhook(
      'raw body',
      'valid_signature',
      mockSupabase
    );

    expect(result.status).toBe(400);
    expect(result.message).toContain('Missing required metadata');
  });
});
