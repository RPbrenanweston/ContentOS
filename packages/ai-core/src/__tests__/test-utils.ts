/**
 * Shared test utilities for AI Core tests
 *
 * Consolidates mock factories that were previously duplicated
 * across 12+ test files.
 */
import { vi } from 'vitest';

// ─── Model Factories ──────────────────────────────────────

export function createMockModel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    display_name: 'Claude Sonnet 4',
    cost_per_input_token: 0.000003,
    cost_per_output_token: 0.000015,
    max_context_tokens: 200000,
    max_output_tokens: 8192,
    supports_streaming: true,
    supports_tools: true,
    is_default: true,
    is_active: true,
    ...overrides,
  };
}

export function createOpenAIModel(overrides: Record<string, unknown> = {}) {
  return createMockModel({
    id: 'gpt-4o',
    provider: 'openai',
    display_name: 'GPT-4o',
    cost_per_input_token: 0.000005,
    cost_per_output_token: 0.000015,
    ...overrides,
  });
}

export function createOpenRouterModel(overrides: Record<string, unknown> = {}) {
  return createMockModel({
    id: 'google/gemini-2.0-flash-exp:free',
    provider: 'openrouter',
    display_name: 'Gemini 2.0 Flash (Free)',
    cost_per_input_token: 0,
    cost_per_output_token: 0,
    ...overrides,
  });
}

// ─── Credit Balance Factory ───────────────────────────────

export function createMockCreditBalance(
  remainingUsd: number = 100,
  options: {
    usedUsd?: number;
    spendingCapUsd?: number | null;
    adminCapUsd?: number | null;
  } = {},
) {
  const now = new Date();
  return {
    credits_remaining_usd: remainingUsd.toFixed(4),
    credits_used_usd: (options.usedUsd ?? 0).toFixed(4),
    spending_cap_usd: options.spendingCapUsd != null ? options.spendingCapUsd.toFixed(4) : null,
    admin_cap_usd: options.adminCapUsd != null ? options.adminCapUsd.toFixed(4) : null,
    period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    period_end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  };
}

// ─── Supabase Mock Factory ────────────────────────────────

/**
 * Creates a mock Supabase client with pre-configured table handlers.
 *
 * Usage:
 *   const mock = createMockSupabase();
 *   // Override specific tables:
 *   const mock = createMockSupabase({ model: createOpenAIModel() });
 *   // Access the raw from() mock for assertions:
 *   expect(mock.from).toHaveBeenCalledWith('ai_usage_log');
 */
export function createMockSupabase(options: {
  model?: Record<string, unknown> | null;
  creditBalance?: Record<string, unknown> | null;
  apiKey?: Record<string, unknown> | null;
  orgMember?: Record<string, unknown> | null;
} = {}) {
  const {
    model = createMockModel(),
    creditBalance = createMockCreditBalance(),
    apiKey = null,
    orgMember = null,
  } = options;

  // Track insert/update calls for assertions
  const usageInserts: unknown[] = [];
  const updateCalls: unknown[] = [];

  const mockFrom = vi.fn((table: string) => {
    if (table === 'ai_models') {
      return buildChain({ data: model, error: null });
    }

    if (table === 'ai_api_keys') {
      return {
        ...buildChain({ data: apiKey, error: apiKey ? null : { message: 'Not found' } }),
        upsert: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        update: vi.fn().mockReturnValue(
          buildEqChain({ data: null, error: null }),
        ),
      };
    }

    if (table === 'ai_credit_balances') {
      return {
        ...buildChain({ data: creditBalance, error: null }),
        update: vi.fn().mockImplementation((data: unknown) => {
          updateCalls.push(data);
          return buildEqChain({ data: null, error: null });
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }

    if (table === 'ai_usage_log') {
      return {
        insert: vi.fn().mockImplementation((data: unknown) => {
          usageInserts.push(data);
          return Promise.resolve({ data: null, error: null });
        }),
      };
    }

    if (table === 'org_members') {
      return buildChain({ data: orgMember, error: null });
    }

    // Fallback for any other table
    return buildChain({ data: null, error: null });
  });

  return {
    from: mockFrom,
    // Expose tracked calls for assertions
    _usageInserts: usageInserts,
    _updateCalls: updateCalls,
  };
}

// ─── Internal Helpers ─────────────────────────────────────

/**
 * Builds a deeply-chainable mock for Supabase query chains like:
 *   .select().eq().eq().is().lte().gt().maybeSingle()
 *
 * Every chaining method returns the same object, so the chain
 * works regardless of order or depth.
 */
function buildChain(result: { data: unknown; error: unknown }) {
  const terminus: Record<string, unknown> = {};

  const chainMethods = ['select', 'eq', 'is', 'lte', 'gt', 'in'];
  const endMethods = ['single', 'maybeSingle'];

  // All end methods resolve to the result
  for (const method of endMethods) {
    terminus[method] = vi.fn().mockResolvedValue(result);
  }

  // All chain methods return the same terminus object (self-referencing)
  for (const method of chainMethods) {
    terminus[method] = vi.fn().mockReturnValue(terminus);
  }

  // Also support .insert() and .update() at the chain root
  terminus.insert = vi.fn().mockResolvedValue({ data: null, error: null });
  terminus.update = vi.fn().mockReturnValue(terminus);
  terminus.upsert = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  return terminus;
}

/**
 * Builds a chain starting from .eq() — used for update().eq().eq()
 */
function buildEqChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.gt = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}
