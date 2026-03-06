/**
 * @crumb
 * @id sal-ts-integration-tests
 * @intent Validate end-to-end chat flows so regressions in module wiring are caught before production — covers client, usage logging, and billing integration
 * @responsibilities Test chat() and chatStream() against mocked Anthropic SDK, verify usage rows written to Supabase, confirm zero-balance guard blocks managed-key calls, test retry on 429
 * @contracts in: vitest mocked Anthropic SDK + Supabase | out: test assertions | all HTTP calls mocked, no real API calls
 * @hazards vi.mock('@anthropic-ai/sdk') is module-level — shared across all tests; incomplete beforeEach reset leaves inter-test pollution; stream ordering test relies on Promise resolution order, not guaranteed
 * @area API
 * @refs packages/ai-core/src/client.ts, packages/ai-core/src/__tests__/test-utils.ts
 * @prompt Should streaming tests use a proper async iterator instead of relying on Promise resolution order?
 */

/**
 * Integration tests for AI Core client
 * Tests end-to-end flows across modules: client → usage logging → billing
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { createAIClient } from '../client';
import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK at module level
vi.mock('@anthropic-ai/sdk', () => {
  const mockMessages = {
    create: vi.fn(),
    stream: vi.fn(),
  };

  return {
    default: vi.fn(() => ({
      messages: mockMessages,
    })),
    // Export mock messages for test access
    __mockMessages: mockMessages,
  };
});

describe('Integration Tests - AI Core', () => {
  let mockSupabase: SupabaseClient;
  let usageLogInserts: any[];
  let mockMessagesCreate: Mock;
  let mockMessagesStream: Mock;

  beforeEach(() => {
    // Reset state
    usageLogInserts = [];

    // Set managed API key environment variable
    process.env.ANTHROPIC_API_KEY = 'sk-test-managed-key';

    // Get mocked Anthropic SDK methods
    const AnthropicMock = Anthropic as any;
    mockMessagesCreate = vi.fn().mockResolvedValue({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Test response',
        },
      ],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 20,
      },
    });

    mockMessagesStream = vi.fn(() => ({
      async *[Symbol.asyncIterator]() {
        yield {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        };
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Hello' },
        };
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: ' World' },
        };
        yield {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn' },
          usage: { output_tokens: 2 },
        };
      },
      async finalMessage() {
        return {
          id: 'msg_stream_test',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello World' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 2 },
        };
      },
    }));

    // Configure Anthropic constructor mock to return these methods
    AnthropicMock.mockImplementation(() => ({
      messages: {
        create: mockMessagesCreate,
        stream: mockMessagesStream,
      },
    }));

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'ai_models') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'claude-sonnet-4-20250514',
                    provider: 'anthropic',
                    display_name: 'Claude Sonnet 4',
                    cost_per_input_token: '0.0000030000',
                    cost_per_output_token: '0.0000150000',
                    max_context_tokens: 200000,
                    max_output_tokens: 8192,
                    supports_streaming: true,
                    supports_tools: true,
                    is_default: true,
                    is_active: true,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        if (table === 'ai_api_keys') {
          // Return no BYOK key (managed fallback)
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'No rows found' },
                    }),
                  })),
                })),
              })),
            })),
          };
        }

        if (table === 'ai_usage_log') {
          return {
            insert: vi.fn((data: any) => {
              usageLogInserts.push(data);
              return Promise.resolve({ data, error: null });
            }),
          };
        }

        if (table === 'org_members') {
          // getUserOrgId query - return null (not org member)
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          };
        }

        if (table === 'ai_credit_balances') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  // Add .is() support for user-level queries
                  lte: vi.fn(() => ({
                    gt: vi.fn(() => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          credits_remaining_usd: '10.0000',
                          credits_used_usd: '0.0000',
                          period_start: new Date().toISOString(),
                          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        },
                        error: null,
                      }),
                    })),
                  })),
                })),
              })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({ data: [], error: null })),
        };
      }),
    } as unknown as SupabaseClient;
  });

  it('chat() call logs usage row to database', async () => {
    const client = createAIClient({
      supabaseClient: mockSupabase,
      appId: 'test-app',
    });

    const result = await client.chat({
      userId: 'user123',
      featureId: 'test-feature',
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    // Wait for fire-and-forget logging to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify chat result
    expect(result.content).toBe('Test response');
    expect(result.usage.tokensIn).toBe(10);
    expect(result.usage.tokensOut).toBe(20);

    // Verify usage log insert
    expect(usageLogInserts).toHaveLength(1);
    const logEntry = usageLogInserts[0];
    expect(logEntry.user_id).toBe('user123');
    expect(logEntry.app_id).toBe('test-app');
    expect(logEntry.feature_id).toBe('test-feature');
    expect(logEntry.provider).toBe('anthropic');
    expect(logEntry.model).toBe('claude-sonnet-4-20250514');
    expect(logEntry.tokens_in).toBe(10);
    expect(logEntry.tokens_out).toBe(20);
    expect(logEntry.success).toBe(true);
    expect(logEntry.key_source).toBe('managed');
    expect(typeof logEntry.cost_usd).toBe('number');
    expect(typeof logEntry.latency_ms).toBe('number');
  });

  it('chatStream() logs usage on completion', async () => {
    const client = createAIClient({
      supabaseClient: mockSupabase,
      appId: 'test-app',
    });

    const stream = client.chatStream({
      userId: 'user456',
      featureId: 'test-streaming',
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'Stream test' }],
    });

    // Consume stream
    const chunks: string[] = [];
    for await (const chunk of stream) {
      if (chunk.delta?.type === 'text_delta' && chunk.delta.text) {
        chunks.push(chunk.delta.text);
      }
    }

    // Wait for fire-and-forget logging
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify stream content
    expect(chunks.join('')).toBe('Hello World');

    // Verify usage log insert
    expect(usageLogInserts).toHaveLength(1);
    const logEntry = usageLogInserts[0];
    expect(logEntry.user_id).toBe('user456');
    expect(logEntry.feature_id).toBe('test-streaming');
    expect(logEntry.tokens_in).toBe(10);
    expect(logEntry.tokens_out).toBe(2);
    expect(logEntry.success).toBe(true);
  });

  it('zero balance blocks managed key call', async () => {
    // Mock zero balance
    const zeroBalanceSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'org_members') {
          // getUserOrgId query - return null (not org member)
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'ai_credit_balances') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  // Add .is() support
                  lte: vi.fn(() => ({
                    gt: vi.fn(() => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          credits_remaining_usd: '0.0000',
                          credits_used_usd: '100.0000',
                          period_start: new Date().toISOString(),
                          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        },
                        error: null,
                      }),
                    })),
                  })),
                })),
              })),
            })),
          };
        }
        // Delegate to original mock for other tables
        return (mockSupabase.from as any)(table);
      }),
    } as unknown as SupabaseClient;

    const client = createAIClient({
      supabaseClient: zeroBalanceSupabase,
      appId: 'test-app',
    });

    await expect(
      client.chat({
        userId: 'user789',
        featureId: 'test-blocked',
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'This should fail' }],
      }),
    ).rejects.toThrow('Insufficient credits');
  });

  it('chatStream() delivers chunks in correct order: start → text_delta → stop', async () => {
    const client = createAIClient({
      supabaseClient: mockSupabase,
      appId: 'test-app',
    });

    const stream = client.chatStream({
      userId: 'user-order',
      featureId: 'test-ordering',
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'Order test' }],
    });

    const chunkTypes: string[] = [];
    for await (const chunk of stream) {
      if (chunk.delta?.type) {
        chunkTypes.push(chunk.delta.type);
      }
    }

    // Must start with start_stream, end with stop_stream, text_deltas in between
    expect(chunkTypes[0]).toBe('start_stream');
    expect(chunkTypes[chunkTypes.length - 1]).toBe('stop_stream');
    expect(chunkTypes.filter((t) => t === 'text_delta').length).toBeGreaterThan(0);
  });

  it('chatStream() reports accumulated tokens in stop_stream chunk', async () => {
    const client = createAIClient({
      supabaseClient: mockSupabase,
      appId: 'test-app',
    });

    const stream = client.chatStream({
      userId: 'user-tokens',
      featureId: 'test-tokens',
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'Token test' }],
    });

    let stopChunk: { partialTokens?: { tokensIn: number; tokensOut: number } } | null = null;
    for await (const chunk of stream) {
      if (chunk.delta?.type === 'stop_stream') {
        stopChunk = chunk;
      }
    }

    // stop_stream chunk must include partialTokens from finalMessage()
    expect(stopChunk).not.toBeNull();
    expect(stopChunk!.partialTokens).toBeDefined();
    expect(stopChunk!.partialTokens!.tokensIn).toBe(10);
    expect(stopChunk!.partialTokens!.tokensOut).toBe(2);
  });

  it('chatStream() handles error mid-stream gracefully', async () => {
    // Mock a stream that errors partway through
    mockMessagesStream.mockImplementationOnce(() => ({
      async *[Symbol.asyncIterator]() {
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Partial' },
        };
        const error = new Error('Connection reset') as Error & { status?: number };
        error.status = 500;
        throw error;
      },
      async finalMessage() {
        throw new Error('Stream interrupted');
      },
    }));

    const client = createAIClient({
      supabaseClient: mockSupabase,
      appId: 'test-app',
    });

    const stream = client.chatStream({
      userId: 'user-error',
      featureId: 'test-mid-error',
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'Error test' }],
    });

    const chunks: string[] = [];
    await expect(async () => {
      for await (const chunk of stream) {
        if (chunk.delta?.type === 'text_delta' && chunk.delta.text) {
          chunks.push(chunk.delta.text);
        }
      }
    }).rejects.toThrow();

    // Should have received the partial chunk before the error
    expect(chunks).toContain('Partial');

    // Wait for fire-and-forget logging
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Usage should be logged as failed
    expect(usageLogInserts).toHaveLength(1);
    expect(usageLogInserts[0].success).toBe(false);
  });

  it('retry logic fires on 429 status code', async () => {
    let attemptCount = 0;

    // Override mock to implement retry logic
    mockMessagesCreate.mockImplementation(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        const error: any = new Error('Rate limit exceeded');
        error.status = 429;
        throw error;
      }
      return {
        id: 'msg_retry_success',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Success after retries' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 5, output_tokens: 10 },
      };
    });

    const client = createAIClient({
      supabaseClient: mockSupabase,
      appId: 'test-app',
    });

    const result = await client.chat({
      userId: 'user-retry',
      featureId: 'test-retry',
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'Retry test' }],
    });

    // Wait for logging
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify retry happened
    expect(attemptCount).toBe(3);
    expect(result.content).toBe('Success after retries');

    // Verify only one usage log entry (not per retry)
    expect(usageLogInserts).toHaveLength(1);
    expect(usageLogInserts[0].success).toBe(true);
  });
});
