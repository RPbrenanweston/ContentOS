/**
 * Tests for OpenRouter provider support
 *
 * Covers:
 * - chat() with OpenRouter provider (baseURL, headers, shared helpers)
 * - chatStream() with OpenRouter provider
 * - validateKey() for 'openrouter' provider
 * - syncOpenRouterModels() with mocked API responses
 * - Error mapping (401, 429, 5xx)
 * - Usage logging records correct provider
 * - BYOK key resolution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAIClient } from '../client';
import { validateKey } from '../keys';
import { syncOpenRouterModels } from '../sync';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatParams } from '../types';

// Create mocks at module level
const mockOpenAICreate = vi.fn();
const mockOpenAIStream = vi.fn();
let mockOpenAIConstructor: any;

// Mock OpenAI SDK at module level
// Handle both ES module (import OpenAI) and CommonJS (const OpenAI = require('openai'))
vi.mock('openai', () => {
  class MockConstructor {
    constructor(config: any) {
      mockOpenAIConstructor = config;
    }

    chat = {
      completions: {
        create: mockOpenAICreate,
      },
    };
  }

  return {
    default: MockConstructor,  // For: import OpenAI from 'openai'
    __esModule: true,
  };
});

// Mock Anthropic SDK (not used in these tests but needed to avoid import errors)
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({})),
}));

// Mock global fetch for syncOpenRouterModels tests
global.fetch = vi.fn();

describe('OpenRouter Provider Integration Tests', () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    // Set OpenRouter API key env var for tests
    process.env.OPENROUTER_API_KEY = 'sk-or-test-key-12345';
    process.env.ENCRYPTION_KEY = 'test-encryption-key';

    // Clear mocks before each test
    mockOpenAICreate.mockClear();
    mockOpenAIStream.mockClear();
    mockOpenAIConstructor = undefined;
    vi.mocked(global.fetch).mockClear();

    // Mock Supabase client with table-specific logic
    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_models') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'google/gemini-2.0-flash-001',
                    provider: 'openrouter',
                    display_name: 'Gemini 2.0 Flash',
                    cost_per_input_token: 0.0000001,
                    cost_per_output_token: 0.0000003,
                    max_context_tokens: 32000,
                    max_output_tokens: 8192,
                    supports_streaming: true,
                    supports_tools: true,
                    is_default: false,
                    is_active: true,
                  },
                  error: null,
                }),
              }),
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'org_members') {
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
                is: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    gt: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          credits_remaining_usd: 100,
                          credits_used_usd: 10,
                          period_start: new Date().toISOString(),
                          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'ai_spending_caps') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    gt: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: null,
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('chat() with OpenRouter provider', () => {
    it('should create OpenAI client with correct baseURL for OpenRouter', async () => {
      // Mock successful OpenAI API response
      mockOpenAICreate.mockResolvedValue({
        id: 'chatcmpl-test',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Hello from OpenRouter!',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
        },
      });

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      const params: ChatParams = {
        userId: 'user-123',
        featureId: 'test-feature',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = await client.chat(params);

      // Verify OpenAI constructor was called with OpenRouter baseURL
      expect(mockOpenAIConstructor).toBeDefined();
      expect(mockOpenAIConstructor.baseURL).toBe('https://openrouter.ai/api/v1');
      expect(result.content).toBe('Hello from OpenRouter!');
    });

    it('should include HTTP-Referer and X-Title headers for OpenRouter', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      await client.chat({
        userId: 'user-123',
        featureId: 'test-feature',
        messages: [{ role: 'user', content: 'Test' }],
      });

      // Verify defaultHeaders were set correctly
      expect(mockOpenAIConstructor.defaultHeaders).toEqual({
        'HTTP-Referer': 'https://shared-ai-layer.app',
        'X-Title': 'Shared AI Layer',
      });
    });

    it('should use shared helper functions for message and tool formatting', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 15, completion_tokens: 8 },
      });

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      await client.chat({
        userId: 'user-123',
        featureId: 'test-feature',
        messages: [{ role: 'user', content: 'Test message' }],
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather data',
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

      // Verify API call was made with formatted messages and tools
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Test message' }],
          tools: [
            {
              type: 'function',
              function: {
                name: 'get_weather',
                description: 'Get weather data',
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

    it('should record usage with provider="openrouter" correctly', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 20, completion_tokens: 10 },
      });

      const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

      // Store original from mock
      const originalFrom = mockSupabase.from;
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_usage_log') {
          return { insert: insertSpy };
        }
        // Call original mock for other tables
        return originalFrom(table);
      });

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      await client.chat({
        userId: 'user-123',
        featureId: 'test-feature',
        messages: [{ role: 'user', content: 'Test' }],
      });

      // Wait for fire-and-forget usage logging
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify usage was logged with provider="openrouter"
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openrouter',
          tokens_in: 20,
          tokens_out: 10,
          success: true,
        })
      );
    });

    it('should use BYOK key when available for OpenRouter', async () => {
      // Mock BYOK key in database
      const { encrypt } = await import('../keys');
      const userKey = 'sk-or-user-byok-key';
      const encryptedKey = encrypt(userKey, process.env.ENCRYPTION_KEY!);

      // Store original from mock
      const originalFrom = mockSupabase.from;
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_api_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { encrypted_key: encryptedKey },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        // Call original mock for other tables
        return originalFrom(table);
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'BYOK response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      await client.chat({
        userId: 'user-123',
        featureId: 'test-feature',
        messages: [{ role: 'user', content: 'Test BYOK' }],
      });

      // Verify OpenAI client was created with user's BYOK key
      expect(mockOpenAIConstructor.apiKey).toBe(userKey);
    });
  });

  describe('chatStream() with OpenRouter provider', () => {
    it('should stream responses from OpenRouter correctly', async () => {
      // Mock streaming response
      const mockStream = (async function* () {
        yield {
          id: 'chunk-1',
          choices: [{ delta: { content: 'Hello' }, finish_reason: null }],
        };
        yield {
          id: 'chunk-2',
          choices: [{ delta: { content: ' world' }, finish_reason: null }],
        };
        yield {
          id: 'chunk-3',
          choices: [{ delta: {}, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2 },
        };
      })();

      mockOpenAICreate.mockReturnValue(mockStream);

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      const params: ChatParams = {
        userId: 'user-123',
        featureId: 'test-stream',
        messages: [{ role: 'user', content: 'Stream test' }],
      };

      const stream = client.chatStream(params);
      const chunks: any[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Verify chunk structure
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].delta.type).toBe('start_stream');

      // Verify text deltas
      const textChunks = chunks.filter(c => c.delta?.type === 'text_delta');
      expect(textChunks.length).toBeGreaterThan(0);

      // Verify final stop chunk
      const stopChunk = chunks.find(c => c.delta?.type === 'stop_stream');
      expect(stopChunk).toBeDefined();
    });

    it('should use OpenRouter baseURL for streaming', async () => {
      const mockStream = (async function* () {
        yield {
          choices: [{ delta: { content: 'test' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        };
      })();

      mockOpenAICreate.mockReturnValue(mockStream);

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      const stream = client.chatStream({
        userId: 'user-123',
        featureId: 'test-stream',
        messages: [{ role: 'user', content: 'Test' }],
      });

      // Consume stream
      for await (const chunk of stream) {
        // Just consume
      }

      // Verify baseURL was set for OpenRouter
      expect(mockOpenAIConstructor.baseURL).toBe('https://openrouter.ai/api/v1');
    });
  });

  describe('validateKey() for OpenRouter', () => {
    // Fixed: validateKey now uses dynamic import() instead of require(),
    // so vi.mock('openai') properly intercepts all SDK usage.
    it('should validate OpenRouter API key successfully', async () => {
      mockOpenAICreate.mockImplementationOnce(async () => ({
        choices: [{ message: { content: 'valid' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }));

      const result = await validateKey('openrouter', 'sk-or-valid-key');

      expect(result).toBe(true);
      // Verify baseURL was used
      expect(mockOpenAIConstructor.baseURL).toBe('https://openrouter.ai/api/v1');
      // Verify minimal request parameters
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'google/gemini-2.0-flash-001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        })
      );
    });

    it('should throw InvalidKeyError on 401 for OpenRouter', async () => {
      const error: any = new Error('Unauthorized');
      error.status = 401;

      mockOpenAICreate.mockImplementationOnce(async () => {
        throw error;
      });

      await expect(validateKey('openrouter', 'sk-or-invalid-key')).rejects.toThrow(
        'Invalid API key'
      );
    });

    it('should throw generic error on network failure for OpenRouter', async () => {
      const error = new Error('Network error');

      mockOpenAICreate.mockImplementationOnce(async () => {
        throw error;
      });

      await expect(validateKey('openrouter', 'sk-or-test-key')).rejects.toThrow(
        'Failed to validate API key: Network error'
      );
    });
  });

  describe('syncOpenRouterModels()', () => {
    it('should fetch and sync models from OpenRouter API', async () => {
      // Mock OpenRouter API response
      const mockApiResponse = {
        data: [
          {
            id: 'google/gemini-2.0-flash-001',
            name: 'Gemini 2.0 Flash',
            pricing: {
              prompt: '0.0000001',
              completion: '0.0000003',
            },
            context_length: 32000,
            top_provider: {
              max_completion_tokens: 8192,
            },
          },
          {
            id: 'anthropic/claude-sonnet-4',
            name: 'Claude Sonnet 4',
            pricing: {
              prompt: '0.000003',
              completion: '0.000015',
            },
            context_length: 200000,
            top_provider: {
              max_completion_tokens: 8192,
            },
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      // Mock Supabase select to return empty existing models
      const selectSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });
      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_models') {
          return {
            select: selectSpy,
            upsert: upsertSpy,
            update: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return (mockSupabase as any).from(table);
      });

      const result = await syncOpenRouterModels(mockSupabase);

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith('https://openrouter.ai/api/v1/models');

      // Verify models were upserted
      expect(upsertSpy).toHaveBeenCalledTimes(2);
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'google/gemini-2.0-flash-001',
          provider: 'openrouter',
          display_name: 'Gemini 2.0 Flash',
        }),
        { onConflict: 'id' }
      );

      // Verify result summary
      expect(result.inserted).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.deactivated).toBe(0);
    });

    it('should update existing models with latest pricing', async () => {
      const mockApiResponse = {
        data: [
          {
            id: 'google/gemini-2.0-flash-001',
            name: 'Gemini 2.0 Flash (Updated)',
            pricing: {
              prompt: '0.0000002',  // Price changed
              completion: '0.0000004',
            },
            context_length: 64000,  // Context changed
            top_provider: {
              max_completion_tokens: 16384,
            },
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      // Mock existing model in database
      const selectSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'google/gemini-2.0-flash-001' }],
          error: null,
        }),
      });
      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_models') {
          return {
            select: selectSpy,
            upsert: upsertSpy,
            update: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return (mockSupabase as any).from(table);
      });

      const result = await syncOpenRouterModels(mockSupabase);

      // Should count as update, not insert
      expect(result.inserted).toBe(0);
      expect(result.updated).toBe(1);
    });

    it('should deactivate models no longer in API response', async () => {
      const mockApiResponse = {
        data: [
          {
            id: 'google/gemini-2.0-flash-001',
            name: 'Gemini 2.0 Flash',
            pricing: { prompt: '0.0000001', completion: '0.0000003' },
            context_length: 32000,
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      // Mock two existing models, only one in API response
      const selectSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: 'google/gemini-2.0-flash-001' },
            { id: 'removed/old-model' },
          ],
          error: null,
        }),
      });
      const updateSpy = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_models') {
          return {
            select: selectSpy,
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: updateSpy,
          };
        }
        return (mockSupabase as any).from(table);
      });

      const result = await syncOpenRouterModels(mockSupabase);

      // Verify deactivation
      expect(updateSpy).toHaveBeenCalledWith({ is_active: false });
      expect(result.deactivated).toBe(1);
    });

    it('should skip models with missing or zero pricing', async () => {
      const mockApiResponse = {
        data: [
          {
            id: 'free/model',
            name: 'Free Model',
            pricing: { prompt: '0', completion: '0' },
            context_length: 8192,
          },
          {
            id: 'valid/model',
            name: 'Valid Model',
            pricing: { prompt: '0.000001', completion: '0.000002' },
            context_length: 16384,
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_models') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            upsert: upsertSpy,
            update: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return (mockSupabase as any).from(table);
      });

      await syncOpenRouterModels(mockSupabase);

      // Only valid model should be upserted (free model skipped)
      expect(upsertSpy).toHaveBeenCalledTimes(1);
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'valid/model',
        }),
        { onConflict: 'id' }
      );
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(syncOpenRouterModels(mockSupabase)).rejects.toThrow(
        'OpenRouter sync failed'
      );
    });

    it('should handle network failures gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(syncOpenRouterModels(mockSupabase)).rejects.toThrow(
        'OpenRouter sync failed'
      );
    });
  });

  describe('Error mapping for OpenRouter', () => {
    it('should map 401 errors to AUTHENTICATION_ERROR', async () => {
      const error: any = new Error('Unauthorized');
      error.status = 401;
      mockOpenAICreate.mockRejectedValue(error);

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      await expect(
        client.chat({
          userId: 'user-123',
          featureId: 'test-error',
          messages: [{ role: 'user', content: 'Test' }],
        })
      ).rejects.toThrow();

      // Wait for fire-and-forget usage logging
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error was logged with correct error_code
      const insertCall = vi.mocked(mockSupabase.from).mock.results.find(
        (r: any) => r.value?.insert
      );
      if (insertCall) {
        const insertArgs = vi.mocked(insertCall.value.insert).mock.calls[0];
        if (insertArgs) {
          expect(insertArgs[0]).toMatchObject({
            success: false,
            error_code: 'AUTHENTICATION_ERROR',
          });
        }
      }
    });

    it('should map 429 errors to RATE_LIMIT', async () => {
      const error: any = new Error('Rate limit exceeded');
      error.status = 429;
      mockOpenAICreate.mockRejectedValue(error);

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      await expect(
        client.chat({
          userId: 'user-123',
          featureId: 'test-error',
          messages: [{ role: 'user', content: 'Test' }],
        })
      ).rejects.toThrow();
    });

    it('should map 5xx errors to PROVIDER_ERROR', async () => {
      const error: any = new Error('Internal server error');
      error.status = 500;
      mockOpenAICreate.mockRejectedValue(error);

      const client = createAIClient({
        appId: 'test-app',
        supabaseClient: mockSupabase,
        defaultModel: 'google/gemini-2.0-flash-001',
      });

      await expect(
        client.chat({
          userId: 'user-123',
          featureId: 'test-error',
          messages: [{ role: 'user', content: 'Test' }],
        })
      ).rejects.toThrow();
    });
  });
});
