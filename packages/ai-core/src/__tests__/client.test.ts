import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAIClient } from '../client';
import { ChatParams } from '../types';

describe('AIClient', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Mock Supabase
    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_models') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
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
                  },
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
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }),
    };
  });

  describe('chat', () => {
    it('createAIClient returns AIClient with all methods', () => {
      const client = createAIClient({
        appId: 'scorecard',
        supabaseClient: mockSupabase,
        defaultModel: 'claude-sonnet-4-20250514',
      });

      expect(client).toHaveProperty('chat');
      expect(client).toHaveProperty('chatStream');
      expect(client).toHaveProperty('generate');
      expect(client).toHaveProperty('getUsage');
      expect(client).toHaveProperty('getRemainingCredits');
    });

    it('should handle missing API key gracefully', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const client = createAIClient({
        appId: 'scorecard',
        supabaseClient: mockSupabase,
      });

      expect(client).toBeDefined();

      // Restore
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    });
  });

  describe('chatStream', () => {
    it('returns AsyncIterable', async () => {
      const client = createAIClient({
        appId: 'scorecard',
        supabaseClient: mockSupabase,
      });

      const params: ChatParams = {
        userId: 'user-1',
        featureId: 'test-feature',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const stream = client.chatStream(params);
      expect(stream).toBeDefined();
      expect(stream[Symbol.asyncIterator]).toBeDefined();
    });

    it('stream iterator has correct shape', async () => {
      const client = createAIClient({
        appId: 'scorecard',
        supabaseClient: mockSupabase,
      });

      const params: ChatParams = {
        userId: 'user-1',
        featureId: 'test-feature',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const stream = client.chatStream(params);

      // Verify stream is async iterable
      expect(stream[Symbol.asyncIterator]).toBeDefined();
      const iterator = stream[Symbol.asyncIterator]();
      expect(iterator.next).toBeDefined();
    });
  });
});
