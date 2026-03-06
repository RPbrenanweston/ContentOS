"""
AI client for LLM API calls

SOLID principles applied:
- Single Responsibility: Retry logic in retry.py, error classification in errors.py
- Dependency Inversion: Services injected via constructor, defaulting to concrete implementations

Handles chat, streaming, and structured generation with automatic
usage logging, key resolution, and credit checks.
"""
#
# @crumb
# @id sal-py-client-orchestrator
# @intent Orchestrate LLM calls through model resolution, key lookup, provider dispatch,
#         and usage logging — Python equivalent of the TypeScript client for backend services.
# @responsibilities
#   - Resolve model info and API keys before each call
#   - Delegate provider-specific execution via adapter pattern
#   - Log usage metrics on both success and failure paths
#   - Support both synchronous chat and async streaming responses
# @contracts
#   - Every call (success or failure) produces a usage log entry
#   - Streaming yields start_stream → text_delta* → stop_stream sequence
#   - Errors are classified before re-raising to preserve stack trace
# @hazards
#   - Fire-and-forget logging silently drops write failures — data loss possible
#   - Stream context manager entered but never explicitly exited on error path
#   - generate() raises NotImplementedError — callers must guard against it
# @area API
# @refs providers.py, keys.py, models.py, usage.py, retry.py, errors.py, types.py
# @trail chat-flow#1 | Orchestrate: resolve model → resolve key → call provider → log usage
# @trail byok-flow#2 | Use resolved key (managed or BYOK) for provider call
# @crumbfn chat | Execute non-streaming LLM call with full lifecycle logging | fire-and-forget log may silently fail +L42-L141
# @crumbfn chat_stream | Execute streaming LLM call yielding ChatChunk sequence | stream context manager leak on error +L143-L261
# @prompt What failure modes exist when log_usage silently fails during high-throughput streaming?
# @/crumb
#

import time
from typing import Any, AsyncIterable, Optional
from .types import ChatParams, ChatResult, ChatChunk, ChatChunkDelta, GenerateParams, AIClientConfig, UsageInfo, PartialTokens
from .models import get_model as default_get_model, calculate_cost as default_calculate_cost
from .usage import log_usage as default_log_usage
from .keys import resolve_key as default_resolve_key
from .providers import get_adapter as default_get_adapter
from .retry import retry_with_backoff as default_retry_with_backoff
from .errors import classify_error as default_classify_error


class AIClient:
    """Main AI client for making LLM calls"""

    def __init__(self, config: AIClientConfig, services: dict | None = None):
        self.config = config
        self.app_id = config.app_id
        self.supabase = config.supabase_client
        self.default_model = config.default_model or 'claude-sonnet-4-20250514'

        # Use injected services or defaults (Dependency Inversion)
        s = services or {}
        self._get_model = s.get('get_model', default_get_model)
        self._calculate_cost = s.get('calculate_cost', default_calculate_cost)
        self._resolve_key = s.get('resolve_key', default_resolve_key)
        self._log_usage = s.get('log_usage', default_log_usage)
        self._get_adapter = s.get('get_adapter', default_get_adapter)
        self._retry_with_backoff = s.get('retry_with_backoff', default_retry_with_backoff)
        self._classify_error = s.get('classify_error', default_classify_error)

    async def chat(self, params: ChatParams) -> ChatResult:
        """
        Make a chat completion call

        Args:
            params: Chat parameters including user_id, feature_id, and messages

        Returns:
            ChatResult with content, usage, and metadata
        """
        start_time = time.time()
        model_id = params.model or self.default_model
        detected_provider = 'unknown'

        try:
            # Resolve the model info
            model = self._get_model(model_id, self.supabase)
            provider = model.provider
            detected_provider = provider

            # Resolve API key (BYOK or managed)
            resolved = await self._resolve_key(params.user_id, provider, self.supabase)
            api_key = resolved.api_key
            key_source = resolved.source

            # Provider-specific API call via adapter
            adapter = self._get_adapter(provider)
            client = adapter.create_client(api_key)
            request = adapter.build_request(model_id, model, params)

            response = self._retry_with_backoff(
                lambda: adapter.execute_chat(client, request),
                max_retries=3,
                base_delay_ms=100,
                jitter_factor=0.1,
            )

            result = adapter.parse_chat_response(response)

            # Calculate cost and latency
            cost_usd = self._calculate_cost(model, result.tokens_in, result.tokens_out)
            latency_ms = int((time.time() - start_time) * 1000)

            # Log usage (fire-and-forget)
            self._log_usage(
                supabase=self.supabase,
                user_id=params.user_id,
                app_id=self.app_id,
                feature_id=params.feature_id,
                provider=provider,
                model=model_id,
                tokens_in=result.tokens_in,
                tokens_out=result.tokens_out,
                cost_usd=cost_usd,
                latency_ms=latency_ms,
                success=True,
                key_source=key_source,
            )

            # Return result
            return ChatResult(
                content=result.content,
                usage=UsageInfo(
                    tokens_in=result.tokens_in,
                    tokens_out=result.tokens_out,
                    cost_usd=cost_usd,
                ),
                model=model_id,
                latency_ms=latency_ms,
            )

        except Exception as error:
            latency_ms = int((time.time() - start_time) * 1000)
            error_code = self._classify_error(error)

            # Get model info for error logging (best effort)
            try:
                model = self._get_model(model_id, self.supabase)
                detected_provider = model.provider
            except Exception:
                pass

            # Log failed usage
            self._log_usage(
                supabase=self.supabase,
                user_id=params.user_id,
                app_id=self.app_id,
                feature_id=params.feature_id,
                provider=detected_provider,
                model=model_id,
                tokens_in=0,
                tokens_out=0,
                cost_usd=0,
                latency_ms=latency_ms,
                success=False,
                error_code=error_code,
                key_source='managed',
            )

            raise

    async def chat_stream(self, params: ChatParams) -> AsyncIterable[ChatChunk]:
        """
        Make a streaming chat completion call

        Args:
            params: Chat parameters including user_id, feature_id, and messages

        Yields:
            ChatChunk objects with delta text and partial token counts
        """
        start_time = time.time()
        model_id = params.model or self.default_model
        tokens_in = 0
        tokens_out = 0

        try:
            # Resolve the model info
            model = self._get_model(model_id, self.supabase)
            provider = model.provider

            # Resolve API key (BYOK or managed)
            resolved = await self._resolve_key(params.user_id, provider, self.supabase)
            api_key = resolved.api_key
            key_source = resolved.source

            # Provider-specific streaming via adapter
            adapter = self._get_adapter(provider)
            client = adapter.create_client(api_key)
            request = adapter.build_stream_request(model_id, model, params)

            stream = self._retry_with_backoff(
                lambda: adapter.execute_stream(client, request),
                max_retries=3,
                base_delay_ms=100,
                jitter_factor=0.1,
            )

            # Yield start signal
            yield ChatChunk(delta=ChatChunkDelta(type='start_stream'))

            # Iterate stream chunks
            for chunk in stream:
                text = adapter.parse_stream_chunk(chunk)
                if text:
                    yield ChatChunk(
                        delta=ChatChunkDelta(type='text_delta', text=text)
                    )

                chunk_usage = adapter.get_chunk_usage(chunk)
                if chunk_usage:
                    if chunk_usage.tokens_in is not None:
                        tokens_in = chunk_usage.tokens_in
                    if chunk_usage.tokens_out is not None:
                        tokens_out = chunk_usage.tokens_out

            # Get final usage (authoritative for Anthropic, None for OpenAI/OpenRouter)
            final_usage = adapter.get_final_usage(stream)
            if final_usage:
                tokens_in = final_usage['tokens_in']
                tokens_out = final_usage['tokens_out']

            # Calculate cost and latency
            cost_usd = self._calculate_cost(model, tokens_in, tokens_out)
            latency_ms = int((time.time() - start_time) * 1000)

            # Yield stop signal with final tokens
            yield ChatChunk(
                delta=ChatChunkDelta(type='stop_stream'),
                partial_tokens=PartialTokens(tokens_in=tokens_in, tokens_out=tokens_out)
            )

            # Log usage (fire-and-forget)
            self._log_usage(
                supabase=self.supabase,
                user_id=params.user_id,
                app_id=self.app_id,
                feature_id=params.feature_id,
                provider=provider,
                model=model_id,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost_usd=cost_usd,
                latency_ms=latency_ms,
                success=True,
                key_source=key_source,
            )

        except Exception as error:
            latency_ms = int((time.time() - start_time) * 1000)
            error_code = self._classify_error(error)
            detected_provider = 'unknown'

            try:
                model = self._get_model(model_id, self.supabase)
                detected_provider = model.provider
            except Exception:
                pass

            # Use 'managed' as default key_source for error path —
            # resolve_key may not have been reached before the error
            key_source = 'managed'

            self._log_usage(
                supabase=self.supabase,
                user_id=params.user_id,
                app_id=self.app_id,
                feature_id=params.feature_id,
                provider=detected_provider,
                model=model_id,
                tokens_in=0,
                tokens_out=0,
                cost_usd=0,
                latency_ms=latency_ms,
                success=False,
                error_code=error_code,
                key_source=key_source,
            )

            raise

    async def generate(self, params: GenerateParams) -> Any:
        """
        Generate structured output matching a schema

        Args:
            params: Generate parameters with schema

        Returns:
            Structured data matching the provided schema
        """
        raise NotImplementedError("generate() will be implemented later")


def create_ai_client(app_id: str, supabase: Any, default_model: Optional[str] = None, services: dict | None = None) -> AIClient:
    """
    Factory function to create an AIClient instance

    Args:
        app_id: Application identifier for usage tracking
        supabase: Supabase client instance
        default_model: Optional default model to use for calls
        services: Optional dict of service overrides for dependency injection

    Returns:
        Configured AIClient instance
    """
    config = AIClientConfig(
        app_id=app_id,
        supabase_client=supabase,
        default_model=default_model
    )
    return AIClient(config, services=services)
