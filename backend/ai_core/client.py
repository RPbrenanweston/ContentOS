"""
AI client for LLM API calls

Handles chat, streaming, and structured generation with automatic
usage logging, key resolution, and credit checks.
"""

import time
from typing import Any, AsyncIterable, Optional
from .types import ChatParams, ChatResult, ChatChunk, ChatChunkDelta, GenerateParams, AIClientConfig, UsageInfo, PartialTokens
from .models import get_model, calculate_cost
from .usage import log_usage
from .keys import resolve_key
from .providers import get_adapter, retry_with_backoff, classify_error


class AIClient:
    """Main AI client for making LLM calls"""

    def __init__(self, config: AIClientConfig):
        self.config = config
        self.app_id = config.app_id
        self.supabase = config.supabase_client
        self.default_model = config.default_model or 'claude-sonnet-4-20250514'

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
            model = get_model(model_id, self.supabase)
            provider = model.provider
            detected_provider = provider

            # Resolve API key (BYOK or managed)
            resolved = await resolve_key(params.user_id, provider, self.supabase)
            api_key = resolved.api_key
            key_source = resolved.source

            # Provider-specific API call via adapter
            adapter = get_adapter(provider)
            client = adapter.create_client(api_key)
            request = adapter.build_request(model_id, model, params)

            response = retry_with_backoff(
                lambda: adapter.execute_chat(client, request),
                max_retries=3,
                base_delay_ms=100,
                jitter_factor=0.1,
            )

            result = adapter.parse_chat_response(response)

            # Calculate cost and latency
            cost_usd = calculate_cost(model, result.tokens_in, result.tokens_out)
            latency_ms = int((time.time() - start_time) * 1000)

            # Log usage (fire-and-forget)
            log_usage(
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
            error_code = classify_error(error)

            # Get model info for error logging (best effort)
            try:
                model = get_model(model_id, self.supabase)
                detected_provider = model.provider
            except Exception:
                pass

            # Log failed usage
            log_usage(
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
            model = get_model(model_id, self.supabase)
            provider = model.provider

            # Resolve API key (BYOK or managed)
            resolved = await resolve_key(params.user_id, provider, self.supabase)
            api_key = resolved.api_key
            key_source = resolved.source

            # Provider-specific streaming via adapter
            adapter = get_adapter(provider)
            client = adapter.create_client(api_key)
            request = adapter.build_stream_request(model_id, model, params)

            stream = retry_with_backoff(
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
            cost_usd = calculate_cost(model, tokens_in, tokens_out)
            latency_ms = int((time.time() - start_time) * 1000)

            # Yield stop signal with final tokens
            yield ChatChunk(
                delta=ChatChunkDelta(type='stop_stream'),
                partial_tokens=PartialTokens(tokens_in=tokens_in, tokens_out=tokens_out)
            )

            # Log usage (fire-and-forget)
            log_usage(
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
            error_code = classify_error(error)
            detected_provider = 'unknown'

            try:
                model = get_model(model_id, self.supabase)
                detected_provider = model.provider
            except Exception:
                pass

            # Use 'managed' as default key_source for error path —
            # resolve_key may not have been reached before the error
            key_source = 'managed'

            log_usage(
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


def create_ai_client(app_id: str, supabase: Any, default_model: Optional[str] = None) -> AIClient:
    """
    Factory function to create an AIClient instance

    Args:
        app_id: Application identifier for usage tracking
        supabase: Supabase client instance
        default_model: Optional default model to use for calls

    Returns:
        Configured AIClient instance
    """
    config = AIClientConfig(
        app_id=app_id,
        supabase_client=supabase,
        default_model=default_model
    )
    return AIClient(config)
