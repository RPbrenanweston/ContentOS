"""
Provider adapters for LLM API calls

Each adapter handles SDK-specific details: client creation, request building,
response parsing, and streaming. OpenRouter extends OpenAI since it uses the
same SDK with a different base URL.

Mirrors the TypeScript version at packages/ai-core/src/providers.ts
"""

import time
import random
from abc import ABC, abstractmethod
from typing import Any, Iterator

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


class ProviderAdapter(ABC):
    """Abstract base class for provider adapters"""

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


class OpenRouterAdapter(OpenAIAdapter):
    """Adapter for OpenRouter API (extends OpenAI with custom base URL)"""

    def create_client(self, api_key: str) -> Any:
        return OpenAI(
            api_key=api_key,
            base_url='https://openrouter.ai/api/v1',
        )


# Adapter registry
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


# --- Retry Logic ---


def is_retryable_error(error: Exception) -> bool:
    """Determine if an error is retryable (429 rate limit or 5xx server errors)"""
    status = getattr(error, 'status_code', None) or getattr(error, 'status', None)
    if status == 429:
        return True
    if status and status >= 500:
        return True
    return False


def calculate_backoff_delay(attempt: int, base_delay_ms: float, jitter_factor: float) -> float:
    """Calculate exponential backoff delay with jitter (in seconds)"""
    exponential_delay = (2 ** attempt) * base_delay_ms
    jitter = random.random() * jitter_factor * exponential_delay
    return (exponential_delay + jitter) / 1000  # Convert ms to seconds


def retry_with_backoff(
    operation,
    max_retries: int = 3,
    base_delay_ms: float = 100,
    jitter_factor: float = 0.1,
):
    """
    Execute an operation with retry logic using exponential backoff.

    Args:
        operation: Callable that performs the operation
        max_retries: Maximum number of retry attempts
        base_delay_ms: Base delay in milliseconds
        jitter_factor: Jitter factor for randomizing delay

    Returns:
        Result of the operation

    Raises:
        The last error if all retries are exhausted
    """
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            return operation()
        except Exception as error:
            last_error = error

            if not is_retryable_error(error):
                raise

            if attempt == max_retries:
                raise

            delay = calculate_backoff_delay(attempt, base_delay_ms, jitter_factor)
            time.sleep(delay)

    # Should never reach here, but just in case
    raise last_error


# --- Error Classification ---


def classify_error(error: Exception) -> str:
    """Classify a provider error by HTTP status code"""
    status = getattr(error, 'status_code', None) or getattr(error, 'status', None)
    if status in (401, 403):
        return 'AUTHENTICATION_ERROR'
    if status == 429:
        return 'RATE_LIMIT'
    if status == 400:
        return 'INVALID_REQUEST'
    if status and status >= 500:
        return 'PROVIDER_ERROR'
    return 'UNKNOWN'
