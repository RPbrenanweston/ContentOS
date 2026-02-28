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
  createClient(apiKey: string): any;
  buildRequest(modelId: string, model: ModelInfo, params: ChatParams): any;
  executeChat(client: any, request: any): Promise<any>;
  parseChatResponse(response: any): ChatCallResult;
}

/** Streaming provider capabilities (Interface Segregation) */
export interface StreamProvider {
  buildStreamRequest(modelId: string, model: ModelInfo, params: ChatParams): any;
  executeStream(client: any, request: any): Promise<any>;
  parseStreamChunk(chunk: any): string | null;
  getChunkUsage(chunk: any): ChunkUsage | null;
  getFinalUsage(stream: any): Promise<{ tokensIn: number; tokensOut: number } | null>;
}

/** Full provider adapter combining chat and streaming */
export interface ProviderAdapter extends ChatProvider, StreamProvider {}

function formatOpenAITools(tools: Tool[]) {
  return tools.map(tool => ({
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

  buildRequest(modelId: string, model: ModelInfo, params: ChatParams): any {
    const messages = params.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const request: any = {
      model: modelId,
      max_tokens: params.maxTokens || model.maxOutputTokens,
      temperature: params.temperature,
      messages,
    };

    if (params.tools && params.tools.length > 0) {
      request.tools = params.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      }));
    }

    return request;
  }

  async executeChat(client: any, request: any): Promise<any> {
    return client.messages.create(request);
  }

  parseChatResponse(response: any): ChatCallResult {
    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => ('text' in block ? block.text : ''))
      .join('');

    return {
      content,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }

  buildStreamRequest(modelId: string, model: ModelInfo, params: ChatParams): any {
    return this.buildRequest(modelId, model, params);
  }

  async executeStream(client: any, request: any): Promise<any> {
    return client.messages.stream(request);
  }

  parseStreamChunk(chunk: any): string | null {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      return chunk.delta.text;
    }
    return null;
  }

  getChunkUsage(chunk: any): ChunkUsage | null {
    if (chunk.type === 'message_delta' && chunk.usage) {
      return { tokensOut: chunk.usage.output_tokens };
    }
    return null;
  }

  async getFinalUsage(stream: any): Promise<{ tokensIn: number; tokensOut: number } | null> {
    const finalMessage = await stream.finalMessage();
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

  buildRequest(modelId: string, model: ModelInfo, params: ChatParams): any {
    const messages = params.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const request: any = {
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

  async executeChat(client: any, request: any): Promise<any> {
    return client.chat.completions.create(request);
  }

  parseChatResponse(response: any): ChatCallResult {
    return {
      content: response.choices[0]?.message?.content || '',
      tokensIn: response.usage?.prompt_tokens || 0,
      tokensOut: response.usage?.completion_tokens || 0,
    };
  }

  buildStreamRequest(modelId: string, model: ModelInfo, params: ChatParams): any {
    const request = this.buildRequest(modelId, model, params);
    request.stream = true;
    request.stream_options = { include_usage: true };
    return request;
  }

  async executeStream(client: any, request: any): Promise<any> {
    return client.chat.completions.create(request);
  }

  parseStreamChunk(chunk: any): string | null {
    return chunk.choices[0]?.delta?.content || null;
  }

  getChunkUsage(chunk: any): ChunkUsage | null {
    if (chunk.usage) {
      return {
        tokensIn: chunk.usage.prompt_tokens,
        tokensOut: chunk.usage.completion_tokens,
      };
    }
    return null;
  }

  async getFinalUsage(_stream: any): Promise<{ tokensIn: number; tokensOut: number } | null> {
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

  buildRequest(modelId: string, model: ModelInfo, params: ChatParams): any {
    return this.delegate.buildRequest(modelId, model, params);
  }

  executeChat(client: any, request: any): Promise<any> {
    return this.delegate.executeChat(client, request);
  }

  parseChatResponse(response: any): ChatCallResult {
    return this.delegate.parseChatResponse(response);
  }

  buildStreamRequest(modelId: string, model: ModelInfo, params: ChatParams): any {
    return this.delegate.buildStreamRequest(modelId, model, params);
  }

  executeStream(client: any, request: any): Promise<any> {
    return this.delegate.executeStream(client, request);
  }

  parseStreamChunk(chunk: any): string | null {
    return this.delegate.parseStreamChunk(chunk);
  }

  getChunkUsage(chunk: any): ChunkUsage | null {
    return this.delegate.getChunkUsage(chunk);
  }

  getFinalUsage(stream: any): Promise<{ tokensIn: number; tokensOut: number } | null> {
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
