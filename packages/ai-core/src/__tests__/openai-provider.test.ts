/**
 * Tests for OpenAI provider support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAIClient } from '../client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Create mock at module level
const mockOpenAICreate = vi.fn();

// Mock OpenAI SDK at module level
vi.mock('openai', () => {
  return {
    default: vi.fn(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    })),
  };
});

// Mock Anthropic SDK (not used in these tests but needed to avoid import errors)
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({})),
}));

describe('OpenAI Provider Support', () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    // Set OpenAI API key env var for tests
    process.env.OPENAI_API_KEY = 'test-openai-key-12345';

    // Clear mock before each test
    mockOpenAICreate.mockClear();

    // Mock Supabase client with table-specific logic (matching client.test.ts pattern)
    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_models') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'gpt-4o',
                    provider: 'openai',
                    display_name: 'GPT-4o',
                    cost_per_input_token: 0.0000025,
                    cost_per_output_token: 0.00001,
                    max_context_tokens: 128000,
                    max_output_tokens: 16384,
                    supports_streaming: true,
                    supports_tools: true,
                    is_default: false,
                    is_active: true,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'org_members') {
          // getUserOrgId query - return null (not org member)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'ai_api_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: new Error('Not found'),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'ai_usage_log') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'ai_credit_balances') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({  // Add .is() support
                  lte: vi.fn().mockReturnValue({
                    gt: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { credits_remaining_usd: '100.00' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }),
    } as any;
  });

  it('should detect OpenAI provider from model registry', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'Hello!' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });

    const client = createAIClient({
      appId: 'test-app',
      supabaseClient: mockSupabase,
    });

    await client.chat({
      userId: 'user-123',
      featureId: 'test-feature',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    // Verify OpenAI SDK was called
    expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
  });

  it('should call OpenAI chat completions API correctly', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'Response text' } }],
      usage: { prompt_tokens: 15, completion_tokens: 20 },
    });

    const client = createAIClient({
      appId: 'test-app',
      supabaseClient: mockSupabase,
    });

    const result = await client.chat({
      userId: 'user-123',
      featureId: 'test-feature',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Test message' }],
      temperature: 0.7,
      maxTokens: 100,
    });

    // Verify OpenAI was called with correct parameters
    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Test message' }],
        temperature: 0.7,
        max_tokens: 100,
      })
    );

    // Verify response format
    expect(result.content).toBe('Response text');
    expect(result.usage.tokensIn).toBe(15);
    expect(result.usage.tokensOut).toBe(20);
  });

  it('should log usage with OpenAI provider', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'Test' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });

    const client = createAIClient({
      appId: 'test-app',
      supabaseClient: mockSupabase,
    });

    await client.chat({
      userId: 'user-123',
      featureId: 'test-feature',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    // Give time for fire-and-forget logging
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify usage was logged with correct provider
    expect(mockSupabase.from).toHaveBeenCalledWith('ai_usage_log');
  });

  it('should support OpenAI tools/functions', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'Function result' } }],
      usage: { prompt_tokens: 20, completion_tokens: 10 },
    });

    const client = createAIClient({
      appId: 'test-app',
      supabaseClient: mockSupabase,
    });

    await client.chat({
      userId: 'user-123',
      featureId: 'test-feature',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Use the tool' }],
      tools: [
        {
          name: 'get_weather',
          description: 'Get weather for a location',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string' },
            },
            required: ['location'],
          },
        },
      ],
    });

    // Verify tools were formatted correctly for OpenAI
    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather for a location',
              parameters: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                },
                required: ['location'],
              },
            },
          },
        ],
      })
    );
  });
});
