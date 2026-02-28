"""
Provider adapters for LLM API calls

SOLID principles applied:
- Interface Segregation: ChatProvider and StreamProvider are separate ABCs
- Liskov Substitution: OpenRouterAdapter uses composition, not inheritance
- Open/Closed: New providers can be registered via register_adapter()

Mirrors the TypeScript version at packages/ai-core/src/providers.ts
"""

from abc import ABC, abstractmethod
from typing import Any

from anthropic import Anthropic
from openai import OpenAI
from .types import ChatParams, ModelInfo, Tool


class ChatCallResult:
    """Result of parsing a non-streaming chat response"""
    __slots__ = ('content', 'tokens_in', 'tokens_out')

    def __init__(self, content: str, tokens_in: int, tokens_out: int):
        self.content = content
        self.tokens_in = tokens_in
        self.tokens_out = tokens_out


class ChunkUsage:
    """Partial token usage extracted from a stream chunk"""
    __slots__ = ('tokens_in', 'tokens_out')

    def __init__(self, tokens_in: int | None = None, tokens_out: int | None = None):
        self.tokens_in = tokens_in
        self.tokens_out = tokens_out


class ChatProvider(ABC):
    """Chat-only provider capabilities (Interface Segregation)"""

    @abstractmethod
    def create_client(self, api_key: str) -> Any:
        """Create an SDK client instance"""

    @abstractmethod
    def build_request(self, model_id: str, model: ModelInfo, params: ChatParams) -> dict:
        """Build a non-streaming request"""

    @abstractmethod
    def execute_chat(self, client: Any, request: dict) -> Any:
        """Execute a non-streaming chat call"""

    @abstractmethod
    def parse_chat_response(self, response: Any) -> ChatCallResult:
        """Parse a non-streaming response into content and usage"""


class StreamProvider(ABC):
    """Streaming provider capabilities (Interface Segregation)"""

    @abstractmethod
    def build_stream_request(self, model_id: str, model: ModelInfo, params: ChatParams) -> dict:
        """Build a streaming request"""

    @abstractmethod
    def execute_stream(self, client: Any, request: dict) -> Any:
        """Execute a streaming chat call, returning an iterable"""

    @abstractmethod
    def parse_stream_chunk(self, chunk: Any) -> str | None:
        """Extract text from a stream chunk, or None if not a text chunk"""

    @abstractmethod
    def get_chunk_usage(self, chunk: Any) -> ChunkUsage | None:
        """Extract partial usage from a stream chunk"""

    @abstractmethod
    def get_final_usage(self, stream: Any) -> dict[str, int] | None:
        """Get final authoritative usage after stream completes.
        Returns dict with 'tokens_in' and 'tokens_out', or None."""


class ProviderAdapter(ChatProvider, StreamProvider):
    """Full provider adapter combining chat and streaming"""
    pass


class AnthropicAdapter(ProviderAdapter):
    """Adapter for Anthropic API (Claude models)"""

    def create_client(self, api_key: str) -> Any:
        return Anthropic(api_key=api_key)

    def build_request(self, model_id: str, model: ModelInfo, params: ChatParams) -> dict:
        messages = [
            {'role': msg.role, 'content': msg.content}
            for msg in params.messages
        ]

        request: dict[str, Any] = {
            'model': model_id,
            'max_tokens': params.max_tokens or model.max_output_tokens,
            'messages': messages,
        }

        if params.temperature is not None:
            request['temperature'] = params.temperature

        if params.tools:
            request['tools'] = [
                {
                    'name': tool.name,
                    'description': tool.description,
                    'input_schema': tool.input_schema,
                }
                for tool in params.tools
            ]

        return request

    def execute_chat(self, client: Any, request: dict) -> Any:
        return client.messages.create(**request)

    def parse_chat_response(self, response: Any) -> ChatCallResult:
        content_blocks = [block for block in response.content if block.type == 'text']
        content = ' '.join([block.text for block in content_blocks])

        return ChatCallResult(
            content=content,
            tokens_in=response.usage.input_tokens,
            tokens_out=response.usage.output_tokens,
        )

    def build_stream_request(self, model_id: str, model: ModelInfo, params: ChatParams) -> dict:
        return self.build_request(model_id, model, params)

    def execute_stream(self, client: Any, request: dict) -> Any:
        # client.messages.stream() returns a MessageStreamManager (context manager).
        # Enter the context to get the iterable MessageStream.
        stream_manager = client.messages.stream(**request)
        return stream_manager.__enter__()

    def parse_stream_chunk(self, chunk: Any) -> str | None:
        if chunk.type == 'content_block_delta' and hasattr(chunk.delta, 'text'):
            return chunk.delta.text
        return None

    def get_chunk_usage(self, chunk: Any) -> ChunkUsage | None:
        if chunk.type == 'message_delta' and hasattr(chunk, 'usage'):
            return ChunkUsage(tokens_out=chunk.usage.output_tokens)
        return None

    def get_final_usage(self, stream: Any) -> dict[str, int] | None:
        final_message = stream.get_final_message()
        if final_message.usage:
            return {
                'tokens_in': final_message.usage.input_tokens,
                'tokens_out': final_message.usage.output_tokens,
            }
        return None


class OpenAIAdapter(ProviderAdapter):
    """Adapter for OpenAI API (GPT models)"""

    def create_client(self, api_key: str) -> Any:
        return OpenAI(api_key=api_key)

    def build_request(self, model_id: str, model: ModelInfo, params: ChatParams) -> dict:
        messages = [
            {'role': msg.role, 'content': msg.content}
            for msg in params.messages
        ]

        request: dict[str, Any] = {
            'model': model_id,
            'max_tokens': params.max_tokens or model.max_output_tokens,
            'messages': messages,
        }

        if params.temperature is not None:
            request['temperature'] = params.temperature

        if params.tools:
            request['tools'] = [
                {
                    'type': 'function',
                    'function': {
                        'name': tool.name,
                        'description': tool.description,
                        'parameters': tool.input_schema,
                    },
                }
                for tool in params.tools
            ]

        return request

    def execute_chat(self, client: Any, request: dict) -> Any:
        return client.chat.completions.create(**request)

    def parse_chat_response(self, response: Any) -> ChatCallResult:
        return ChatCallResult(
            content=response.choices[0].message.content or '',
            tokens_in=response.usage.prompt_tokens,
            tokens_out=response.usage.completion_tokens,
        )

    def build_stream_request(self, model_id: str, model: ModelInfo, params: ChatParams) -> dict:
        request = self.build_request(model_id, model, params)
        request['stream'] = True
        request['stream_options'] = {'include_usage': True}
        return request

    def execute_stream(self, client: Any, request: dict) -> Any:
        return client.chat.completions.create(**request)

    def parse_stream_chunk(self, chunk: Any) -> str | None:
        if chunk.choices and len(chunk.choices) > 0:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                return delta.content
        return None

    def get_chunk_usage(self, chunk: Any) -> ChunkUsage | None:
        if hasattr(chunk, 'usage') and chunk.usage:
            return ChunkUsage(
                tokens_in=chunk.usage.prompt_tokens,
                tokens_out=chunk.usage.completion_tokens,
            )
        return None

    def get_final_usage(self, stream: Any) -> dict[str, int] | None:
        return None


class OpenRouterAdapter(ProviderAdapter):
    """
    OpenRouter adapter using composition instead of inheritance (Liskov Substitution).

    OpenRouter uses the OpenAI SDK with a different base URL.
    Rather than extending OpenAIAdapter (which would change foundational behavior
    and violate LSP), we delegate to an internal OpenAIAdapter for shared logic.
    """

    def __init__(self):
        self._delegate = OpenAIAdapter()

    def create_client(self, api_key: str) -> Any:
        return OpenAI(
            api_key=api_key,
            base_url='https://openrouter.ai/api/v1',
        )

    def build_request(self, model_id: str, model: ModelInfo, params: ChatParams) -> dict:
        return self._delegate.build_request(model_id, model, params)

    def execute_chat(self, client: Any, request: dict) -> Any:
        return self._delegate.execute_chat(client, request)

    def parse_chat_response(self, response: Any) -> ChatCallResult:
        return self._delegate.parse_chat_response(response)

    def build_stream_request(self, model_id: str, model: ModelInfo, params: ChatParams) -> dict:
        return self._delegate.build_stream_request(model_id, model, params)

    def execute_stream(self, client: Any, request: dict) -> Any:
        return self._delegate.execute_stream(client, request)

    def parse_stream_chunk(self, chunk: Any) -> str | None:
        return self._delegate.parse_stream_chunk(chunk)

    def get_chunk_usage(self, chunk: Any) -> ChunkUsage | None:
        return self._delegate.get_chunk_usage(chunk)

    def get_final_usage(self, stream: Any) -> dict[str, int] | None:
        return self._delegate.get_final_usage(stream)


# Mutable adapter registry (Open/Closed principle)
_adapters: dict[str, ProviderAdapter] = {
    'anthropic': AnthropicAdapter(),
    'openai': OpenAIAdapter(),
    'openrouter': OpenRouterAdapter(),
}


def get_adapter(provider: str) -> ProviderAdapter:
    """Get the adapter for a given provider"""
    adapter = _adapters.get(provider)
    if not adapter:
        raise ValueError(f'Unsupported provider: {provider}')
    return adapter


def register_adapter(provider: str, adapter: ProviderAdapter) -> None:
    """
    Register a custom provider adapter (Open/Closed principle).

    Allows extending the system with new providers without modifying
    existing adapter code.
    """
    _adapters[provider] = adapter
