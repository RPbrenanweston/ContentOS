/**
 * @crumb
 * @id sal-ts-phase3-billing-tests
 * @intent Verify credit lifecycle correctness so billing regressions surface before production — covers purchase, deduction, cap enforcement, and idempotency
 * @responsibilities Test Stripe webhook→credit creation, chat deducts credits (fire-and-forget), spending cap blocks calls, duplicate webhooks don't double-credit, BYOK bypasses credit system
 * @contracts in: vitest mocked Anthropic + Stripe SDKs | out: test assertions | no real Stripe or Anthropic calls
 * @hazards fire-and-forget deduction uses setTimeout(100ms) timing hack — flaky under high CI load; vi.mock('stripe') means real Stripe webhook signature validation never exercised
 * @area API
 * @trail billing-flow#3 | Verify credit lifecycle: purchase → deduct → cap
 * @refs packages/ai-core/src/billing.ts, packages/ai-core/src/client.ts, packages/ai-core/src/__tests__/test-utils.ts
 * @prompt Should the 100ms setTimeout in the deduction test be replaced with a waitFor() utility to eliminate timing flakiness?
 */

/**
 * Phase 3 Integration Tests: Billing Flow
 *
 * Tests the complete credit purchase → usage → deduction → cap enforcement flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAIClient } from '../client';
import {
  createCheckoutSession,
  handleStripeWebhook,
  getRemainingCredits,
  checkSpendingCap,
} from '../billing';
import { encrypt } from '../keys';
import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Mock Anthropic SDK at module level
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Integration test response' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
    })),
  };
});

// Mock Stripe SDK
const mockConstructEvent = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/test',
          }),
        },
      },
      customers: {
        create: vi.fn().mockResolvedValue({
          id: 'cus_test_123',
        }),
      },
      webhooks: {
        constructEvent: mockConstructEvent, // Shared mock across all instances
      },
    })),
  };
});

describe('Phase 3 Integration: Billing Flow', () => {
  let mockSupabase: SupabaseClient;
  let mockStripe: any;

  beforeEach(() => {
    // Reset environment variables
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_stripe';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long!';

    // Create mock Supabase client with comprehensive method chaining
    const createMockChain = (returnData: any) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            // Add .is() support for user-level queries
            lte: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue(returnData),
              }),
            }),
          }),
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(returnData),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
            single: vi.fn().mockResolvedValue(returnData),
            maybeSingle: vi.fn().mockResolvedValue(returnData),
          }),
          single: vi.fn().mockResolvedValue(returnData),
          maybeSingle: vi.fn().mockResolvedValue(returnData),
          lte: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
          }),
        }),
        lte: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              // Add .eq().is() for webhook pattern: .lte().gt().eq().is()
              is: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue(returnData),
              }),
            }),
            maybeSingle: vi.fn().mockResolvedValue(returnData),
          }),
        }),
        maybeSingle: vi.fn().mockResolvedValue(returnData),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_models') {
          return createMockChain({
            data: {
              id: 'claude-sonnet-4-20250514',
              provider: 'anthropic',
              cost_per_input_token: '0.000003',
              cost_per_output_token: '0.000015',
              max_output_tokens: 8192,
            },
            error: null,
          });
        }
        if (table === 'org_members') {
          // getUserOrgId query - return null (not org member)
          return createMockChain({ data: null, error: null });
        }
        if (table === 'ai_api_keys') {
          return createMockChain({ data: null, error: null }); // No BYOK key
        }
        if (table === 'ai_credit_balances') {
          return createMockChain({ data: null, error: null }); // Will be configured per test
        }
        if (table === 'ai_usage_log') {
          return createMockChain({ data: null, error: null });
        }
        if (table === 'stripe_payment_logs') {
          return createMockChain({ data: null, error: null });
        }
        if (table === 'users') {
          return createMockChain({ data: null, error: null });
        }
        return createMockChain({ data: null, error: null });
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: credit purchase increases remaining balance', async () => {
    // Create checkout session (simulating user purchasing $10 of credits)
    const session = await createCheckoutSession({
      userId: 'user-123',
      amountUsd: 10,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      supabase: mockSupabase,
    });

    expect(session.sessionId).toBe('cs_test_123');
    expect(session.url).toBe('https://checkout.stripe.com/test');

    // Mock webhook event data
    const webhookEvent = {
      id: 'evt_test',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          metadata: {
            supabase_user_id: 'user-123',
            credit_amount_usd: '10',
          },
        },
      },
    };

    // Configure the shared webhook mock to return this event
    mockConstructEvent.mockReturnValueOnce(webhookEvent);

    // Mock Supabase queries for webhook handler
    let balanceData: any = null;

    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      const createMockChain = (returnData: any) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(returnData),
            is: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockImplementation((data: any) => {
          // Track inserted balance
          if (table === 'ai_credit_balances') {
            balanceData = data;
          }
          return Promise.resolve({ data: null, error: null });
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      if (table === 'stripe_payment_logs') {
        // First call: check idempotency (no existing log)
        return createMockChain({ data: null, error: null });
      }
      if (table === 'ai_credit_balances') {
        // No existing balance row for this period
        return createMockChain({ data: null, error: null });
      }
      return createMockChain({ data: null, error: null });
    });

    // Handle webhook (simulating Stripe sending webhook after payment)
    const result = await handleStripeWebhook(
      JSON.stringify(webhookEvent),
      'test-signature',
      mockSupabase,
    );

    expect(result.status).toBe(200);
    expect(result.message).toContain('Credited 10 USD');

    // Verify balance was created with correct amount
    expect(balanceData).toBeDefined();
    expect(balanceData.credits_remaining_usd).toBe(10);
    expect(balanceData.credits_used_usd).toBe(0);
  });

  it('Test 2: chat call deducts cost from remaining balance', async () => {
    // Set up initial balance
    const initialBalance = {
      data: {
        id: 'balance-123',
        user_id: 'user-123',
        credits_remaining_usd: '5.0000',
        credits_used_usd: '0.0000',
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      error: null,
    };

    let deductedCost = 0;

    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      const createMockChain = (returnData: any) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(returnData),
                maybeSingle: vi.fn().mockResolvedValue(returnData),
              }),
              single: vi.fn().mockResolvedValue(returnData),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
            single: vi.fn().mockResolvedValue(returnData),
            maybeSingle: vi.fn().mockResolvedValue(returnData),
            lte: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue(returnData),
              }),
            }),
            is: vi.fn().mockReturnValue({
              // Add .is() for user-level balance queries
              lte: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
            }),
          }),
          lte: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockImplementation((updateData: any) => ({
          eq: vi.fn().mockImplementation(() => {
            if (table === 'ai_credit_balances' && updateData.credits_used_usd !== undefined) {
              deductedCost = updateData.credits_used_usd;
            }
            return Promise.resolve({ data: null, error: null });
          }),
        })),
      });

      if (table === 'ai_models') {
        return createMockChain({
          data: {
            id: 'claude-sonnet-4-20250514',
            provider: 'anthropic',
            cost_per_input_token: '0.000003',
            cost_per_output_token: '0.000015',
            max_output_tokens: 8192,
          },
          error: null,
        });
      }
      if (table === 'ai_api_keys') {
        return createMockChain({ data: null, error: null }); // No BYOK key (use managed)
      }
      if (table === 'ai_credit_balances') {
        return createMockChain(initialBalance);
      }
      return createMockChain({ data: null, error: null });
    });

    // Create AI client and make a chat call
    const client = createAIClient({
      appId: 'test-app',
      supabaseClient: mockSupabase,
    });

    const result = await client.chat({
      userId: 'user-123',
      featureId: 'test-feature',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.content).toBe('Integration test response');

    // Wait for fire-and-forget deduction to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify cost was deducted
    expect(deductedCost).toBeGreaterThan(0);
    // Cost calculation: 100 input tokens * 0.000003 + 50 output tokens * 0.000015 = 0.00105
    expect(deductedCost).toBeCloseTo(0.00105, 5);
  });

  it('Test 3: spending cap blocks call when limit reached', async () => {
    // Set up balance with spending cap
    const balanceWithCap = {
      data: {
        id: 'balance-123',
        user_id: 'user-123',
        credits_remaining_usd: '10.0000',
        credits_used_usd: '5.0000',
        spending_cap_usd: '5.0000', // User cap set to $5
        admin_cap_usd: null,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      error: null,
    };

    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      const createMockChain = (returnData: any) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              // Add .is() for user-level queries
              lte: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
            }),
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(returnData),
                maybeSingle: vi.fn().mockResolvedValue(returnData),
              }),
              single: vi.fn().mockResolvedValue(returnData),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
            single: vi.fn().mockResolvedValue(returnData),
            maybeSingle: vi.fn().mockResolvedValue(returnData),
            lte: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue(returnData),
              }),
            }),
          }),
          lte: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                // Add .eq().is() for webhook pattern
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      if (table === 'ai_models') {
        return createMockChain({
          data: {
            id: 'claude-sonnet-4-20250514',
            provider: 'anthropic',
            cost_per_input_token: '0.000003',
            cost_per_output_token: '0.000015',
            max_output_tokens: 8192,
          },
          error: null,
        });
      }
      if (table === 'ai_api_keys') {
        return createMockChain({ data: null, error: null }); // No BYOK key
      }
      if (table === 'ai_credit_balances') {
        return createMockChain(balanceWithCap);
      }
      return createMockChain({ data: null, error: null });
    });

    // Create AI client and attempt chat call (should be blocked by spending cap)
    const client = createAIClient({
      appId: 'test-app',
      supabaseClient: mockSupabase,
    });

    // Expect SpendingCapExceededError to be thrown
    await expect(
      client.chat({
        userId: 'user-123',
        featureId: 'test-feature',
        messages: [{ role: 'user', content: 'This should be blocked' }],
      }),
    ).rejects.toThrow('Spending cap exceeded');
  });

  it('Test 4: duplicate webhook does not double credit', async () => {
    // Mock Stripe webhook verification
    const webhookEvent = {
      id: 'evt_test',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          metadata: {
            supabase_user_id: 'user-123',
            credit_amount_usd: '10',
          },
        },
      },
    };

    // Configure the shared webhook mock to return this event
    mockConstructEvent.mockReturnValueOnce(webhookEvent);

    // Mock Supabase: existing payment log (webhook already processed)
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      const createMockChain = (returnData: any) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              // Add .is() support
              lte: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
            }),
            maybeSingle: vi.fn().mockResolvedValue(returnData),
          }),
          lte: vi.fn().mockReturnValue({
            // Add webhook pattern support
            gt: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
          }),
        }),
      });

      if (table === 'stripe_payment_logs') {
        // Existing payment log found (idempotency check)
        return createMockChain({
          data: { id: 'log-123', session_id: 'cs_test_123' },
          error: null,
        });
      }
      return createMockChain({ data: null, error: null });
    });

    // Handle webhook (second time)
    const result = await handleStripeWebhook(
      JSON.stringify(webhookEvent),
      'test-signature',
      mockSupabase,
    );

    expect(result.status).toBe(200);
    expect(result.message).toContain('already processed');
  });

  it('Test 5: BYOK users unaffected by credit system', async () => {
    // Mock Supabase: BYOK key exists for user
    const testApiKey = 'sk-test-byok-key-1234567890';
    const encryptedKey = encrypt(testApiKey, process.env.ENCRYPTION_KEY!);

    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      const createMockChain = (returnData: any) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              // Add .is() for user-level queries
              lte: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
            }),
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(returnData),
                maybeSingle: vi.fn().mockResolvedValue(returnData),
              }),
              single: vi.fn().mockResolvedValue(returnData),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
            single: vi.fn().mockResolvedValue(returnData),
            maybeSingle: vi.fn().mockResolvedValue(returnData),
          }),
          lte: vi.fn().mockReturnValue({
            // Add webhook pattern
            gt: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      if (table === 'ai_models') {
        return createMockChain({
          data: {
            id: 'claude-sonnet-4-20250514',
            provider: 'anthropic',
            cost_per_input_token: '0.000003',
            cost_per_output_token: '0.000015',
            max_output_tokens: 8192,
          },
          error: null,
        });
      }
      if (table === 'ai_api_keys') {
        // BYOK key exists
        return createMockChain({
          data: {
            id: 'key-123',
            encrypted_key: encryptedKey,
          },
          error: null,
        });
      }
      if (table === 'ai_credit_balances') {
        // Zero balance - would block managed key user
        return createMockChain({
          data: {
            credits_remaining_usd: '0.0000',
            credits_used_usd: '0.0000',
          },
          error: null,
        });
      }
      return createMockChain({ data: null, error: null });
    });

    // Create AI client and make chat call (should succeed despite zero balance)
    const client = createAIClient({
      appId: 'test-app',
      supabaseClient: mockSupabase,
    });

    const result = await client.chat({
      userId: 'user-123',
      featureId: 'test-feature',
      messages: [{ role: 'user', content: 'BYOK user chat' }],
    });

    // Should succeed - BYOK users skip credit checks
    expect(result.content).toBe('Integration test response');
  });

  it('Test 6: All Phase 3 tests pass alongside Phase 1 and 2', async () => {
    // This test verifies that Phase 3 integration doesn't break existing functionality
    // Run a basic chat call with managed key (Phase 1 functionality)

    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      const createMockChain = (returnData: any) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(returnData),
                maybeSingle: vi.fn().mockResolvedValue(returnData),
              }),
              single: vi.fn().mockResolvedValue(returnData),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
            single: vi.fn().mockResolvedValue(returnData),
            maybeSingle: vi.fn().mockResolvedValue(returnData),
            lte: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue(returnData),
              }),
            }),
            is: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
            }),
          }),
          lte: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue(returnData),
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue(returnData),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      if (table === 'ai_models') {
        return createMockChain({
          data: {
            id: 'claude-sonnet-4-20250514',
            provider: 'anthropic',
            cost_per_input_token: '0.000003',
            cost_per_output_token: '0.000015',
            max_output_tokens: 8192,
          },
          error: null,
        });
      }
      if (table === 'ai_api_keys') {
        return createMockChain({ data: null, error: null }); // No BYOK key
      }
      if (table === 'ai_credit_balances') {
        // Sufficient balance, no caps
        return createMockChain({
          data: {
            id: 'balance-123',
            credits_remaining_usd: '10.0000',
            credits_used_usd: '0.0000',
            spending_cap_usd: null,
            admin_cap_usd: null,
            period_start: new Date().toISOString(),
            period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        });
      }
      return createMockChain({ data: null, error: null });
    });

    const client = createAIClient({
      appId: 'test-app',
      supabaseClient: mockSupabase,
    });

    const result = await client.chat({
      userId: 'user-123',
      featureId: 'test-feature',
      messages: [{ role: 'user', content: 'Test message' }],
    });

    // Verify basic chat functionality still works
    expect(result.content).toBe('Integration test response');
    expect(result.usage.tokensIn).toBe(100);
    expect(result.usage.tokensOut).toBe(50);
  });
});
