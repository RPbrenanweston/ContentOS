/**
 * Provider adapters for LLM API calls
 *
 * SOLID principles applied:
 * - Interface Segregation: ChatProvider and StreamProvider are separate interfaces
 * - Liskov Substitution: OpenRouterAdapter uses composition, not inheritance
 * - Open/Closed: New providers can be registered via registerAdapter()
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ChatParams, Tool, ModelInfo } from './types';

/** Result of parsing a non-streaming chat response */
export interface ChatCallResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
}

/** Partial token usage extracted from a stream chunk */
export interface ChunkUsage {
  tokensIn?: number;
  tokensOut?: number;
}

/** Chat-only provider capabilities (Interface Segregation) */
export interface ChatProvider {
  createClient(apiKey: string): unknown;
  buildRequest(modelId: string, model: ModelInfo, params: ChatParams): unknown;
  executeChat(client: unknown, request: unknown): Promise<unknown>;
  parseChatResponse(response: unknown): ChatCallResult;
}

/** Streaming provider capabilities (Interface Segregation) */
export interface StreamProvider {
  buildStreamRequest(modelId: string, model: ModelInfo, params: ChatParams): unknown;
  executeStream(client: unknown, request: unknown): Promise<unknown>;
  parseStreamChunk(chunk: unknown): string | null;
  getChunkUsage(chunk: unknown): ChunkUsage | null;
  getFinalUsage(stream: unknown): Promise<{ tokensIn: number; tokensOut: number } | null>;
}

/** Full provider adapter combining chat and streaming */
export interface ProviderAdapter extends ChatProvider, StreamProvider {}

function formatOpenAITools(tools: Tool[]) {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

class AnthropicAdapter implements ProviderAdapter {
  createClient(apiKey: string) {
    return new Anthropic({ apiKey });
  }

  buildRequest(modelId: string, model: ModelInfo, params: ChatParams): Record<string, unknown> {
    const messages = params.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const request: Record<string, unknown> = {
      model: modelId,
      max_tokens: params.maxTokens || model.maxOutputTokens,
      temperature: params.temperature,
      messages,
    };

    if (params.tools && params.tools.length > 0) {
      request.tools = params.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      }));
    }

    return request;
  }

  async executeChat(client: unknown, request: unknown): Promise<Anthropic.Message> {
    return (client as Anthropic).messages.create(
      request as Anthropic.MessageCreateParamsNonStreaming,
    );
  }

  parseChatResponse(response: unknown): ChatCallResult {
    const msg = response as Anthropic.Message;
    const content = msg.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content,
      tokensIn: msg.usage.input_tokens,
      tokensOut: msg.usage.output_tokens,
    };
  }

  buildStreamRequest(
    modelId: string,
    model: ModelInfo,
    params: ChatParams,
  ): Record<string, unknown> {
    return this.buildRequest(modelId, model, params);
  }

  async executeStream(client: unknown, request: unknown): Promise<unknown> {
    return (client as Anthropic).messages.stream(
      request as Anthropic.MessageCreateParams,
    );
  }

  parseStreamChunk(chunk: unknown): string | null {
    const event = chunk as { type: string; delta?: { type?: string; text?: string } };
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      return event.delta.text ?? null;
    }
    return null;
  }

  getChunkUsage(chunk: unknown): ChunkUsage | null {
    const event = chunk as { type: string; usage?: { output_tokens: number } };
    if (event.type === 'message_delta' && event.usage) {
      return { tokensOut: event.usage.output_tokens };
    }
    return null;
  }

  async getFinalUsage(
    stream: unknown,
  ): Promise<{ tokensIn: number; tokensOut: number } | null> {
    const messageStream = stream as { finalMessage(): Promise<Anthropic.Message> };
    const finalMessage = await messageStream.finalMessage();
    if (finalMessage.usage) {
      return {
        tokensIn: finalMessage.usage.input_tokens,
        tokensOut: finalMessage.usage.output_tokens,
      };
    }
    return null;
  }
}

class OpenAIAdapter implements ProviderAdapter {
  createClient(apiKey: string) {
    return new OpenAI({ apiKey });
  }

  buildRequest(modelId: string, model: ModelInfo, params: ChatParams): Record<string, unknown> {
    const messages = params.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const request: Record<string, unknown> = {
      model: modelId,
      max_tokens: params.maxTokens || model.maxOutputTokens,
      temperature: params.temperature,
      messages,
    };

    if (params.tools && params.tools.length > 0) {
      request.tools = formatOpenAITools(params.tools);
    }

    return request;
  }

  async executeChat(client: unknown, request: unknown): Promise<OpenAI.Chat.ChatCompletion> {
    return (client as OpenAI).chat.completions.create(
      request as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    );
  }

  parseChatResponse(response: unknown): ChatCallResult {
    const completion = response as OpenAI.Chat.ChatCompletion;
    return {
      content: completion.choices[0]?.message?.content || '',
      tokensIn: completion.usage?.prompt_tokens || 0,
      tokensOut: completion.usage?.completion_tokens || 0,
    };
  }

  buildStreamRequest(
    modelId: string,
    model: ModelInfo,
    params: ChatParams,
  ): Record<string, unknown> {
    const request = this.buildRequest(modelId, model, params);
    request.stream = true;
    request.stream_options = { include_usage: true };
    return request;
  }

  async executeStream(client: unknown, request: unknown): Promise<unknown> {
    return (client as OpenAI).chat.completions.create(
      request as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
    );
  }

  parseStreamChunk(chunk: unknown): string | null {
    const streamChunk = chunk as OpenAI.Chat.ChatCompletionChunk;
    return streamChunk.choices[0]?.delta?.content || null;
  }

  getChunkUsage(chunk: unknown): ChunkUsage | null {
    const streamChunk = chunk as OpenAI.Chat.ChatCompletionChunk;
    if (streamChunk.usage) {
      return {
        tokensIn: streamChunk.usage.prompt_tokens,
        tokensOut: streamChunk.usage.completion_tokens,
      };
    }
    return null;
  }

  async getFinalUsage(
    _stream: unknown,
  ): Promise<{ tokensIn: number; tokensOut: number } | null> {
    return null;
  }
}

/**
 * OpenRouter adapter using composition instead of inheritance (Liskov Substitution).
 *
 * OpenRouter uses the OpenAI SDK with a different base URL and headers.
 * Rather than extending OpenAIAdapter (which would change foundational behavior
 * and violate LSP), we delegate to an internal OpenAIAdapter for shared logic.
 */
class OpenRouterAdapter implements ProviderAdapter {
  private delegate = new OpenAIAdapter();

  createClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://shared-ai-layer.app',
        'X-Title': 'Shared AI Layer',
      },
    });
  }

  buildRequest(modelId: string, model: ModelInfo, params: ChatParams): Record<string, unknown> {
    return this.delegate.buildRequest(modelId, model, params);
  }

  executeChat(client: unknown, request: unknown): Promise<unknown> {
    return this.delegate.executeChat(client, request);
  }

  parseChatResponse(response: unknown): ChatCallResult {
    return this.delegate.parseChatResponse(response);
  }

  buildStreamRequest(
    modelId: string,
    model: ModelInfo,
    params: ChatParams,
  ): Record<string, unknown> {
    return this.delegate.buildStreamRequest(modelId, model, params);
  }

  executeStream(client: unknown, request: unknown): Promise<unknown> {
    return this.delegate.executeStream(client, request);
  }

  parseStreamChunk(chunk: unknown): string | null {
    return this.delegate.parseStreamChunk(chunk);
  }

  getChunkUsage(chunk: unknown): ChunkUsage | null {
    return this.delegate.getChunkUsage(chunk);
  }

  getFinalUsage(stream: unknown): Promise<{ tokensIn: number; tokensOut: number } | null> {
    return this.delegate.getFinalUsage(stream);
  }
}

/** Mutable adapter registry (Open/Closed principle) */
const adapters: Record<string, ProviderAdapter> = {
  anthropic: new AnthropicAdapter(),
  openai: new OpenAIAdapter(),
  openrouter: new OpenRouterAdapter(),
};

export function getAdapter(provider: string): ProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  return adapter;
}

/**
 * Register a custom provider adapter (Open/Closed principle).
 *
 * Allows extending the system with new providers without modifying
 * existing adapter code.
 */
export function registerAdapter(provider: string, adapter: ProviderAdapter): void {
  adapters[provider] = adapter;
}
