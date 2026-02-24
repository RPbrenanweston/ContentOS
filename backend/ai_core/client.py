"""
AI client for LLM API calls

Handles chat, streaming, and structured generation with automatic
usage logging, key resolution, and credit checks.
"""

import os
import time
from typing import Any, AsyncIterable, Optional
from anthropic import Anthropic
from .types import ChatParams, ChatResult, ChatChunk, ChatChunkDelta, GenerateParams, AIClientConfig, UsageInfo, PartialTokens
from .models import get_model, calculate_cost
from .usage import log_usage
from .keys import resolve_key


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

        try:
            # Resolve the model info
            model = get_model(model_id, self.supabase)

            # Resolve API key (S17 will add BYOK support, for now use env var)
            # resolved = await resolve_key(params.user_id, 'anthropic', self.supabase)
            # For S16: use managed key from environment variable
            api_key = os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                raise ValueError('ANTHROPIC_API_KEY environment variable not set')

            key_source = 'managed'  # Will be resolved.source in S17

            # Create Anthropic client
            client = Anthropic(api_key=api_key)

            # Convert our Message format to Anthropic format
            messages = [
                {'role': msg.role, 'content': msg.content}
                for msg in params.messages
            ]

            # Build request parameters
            request_params = {
                'model': model_id,
                'max_tokens': params.max_tokens or model.max_output_tokens,
                'messages': messages,
            }

            if params.temperature is not None:
                request_params['temperature'] = params.temperature

            if params.tools:
                request_params['tools'] = [
                    {
                        'name': tool.name,
                        'description': tool.description,
                        'input_schema': tool.input_schema,
                    }
                    for tool in params.tools
                ]

            # Make the API call
            response = client.messages.create(**request_params)

            # Extract text from response
            content_blocks = [block for block in response.content if block.type == 'text']
            content = ' '.join([block.text for block in content_blocks])

            # Calculate cost
            tokens_in = response.usage.input_tokens
            tokens_out = response.usage.output_tokens
            cost_usd = calculate_cost(model, tokens_in, tokens_out)

            # Calculate latency
            latency_ms = int((time.time() - start_time) * 1000)

            # Log usage (fire-and-forget)
            log_usage(
                supabase=self.supabase,
                user_id=params.user_id,
                app_id=self.app_id,
                feature_id=params.feature_id,
                provider='anthropic',
                model=model_id,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost_usd=cost_usd,
                latency_ms=latency_ms,
                success=True,
                key_source=key_source,
            )

            # Return result
            return ChatResult(
                content=content,
                usage=UsageInfo(
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    cost_usd=cost_usd,
                ),
                model=model_id,
                latency_ms=latency_ms,
            )

        except Exception as error:
            # Calculate latency for error case
            latency_ms = int((time.time() - start_time) * 1000)

            # Map error types
            error_code = 'UNKNOWN'
            if hasattr(error, 'status_code'):
                status = error.status_code
                if status == 401:
                    error_code = 'AUTHENTICATION_ERROR'
                elif status == 429:
                    error_code = 'RATE_LIMIT'
                elif status >= 500:
                    error_code = 'PROVIDER_ERROR'

            # Log failed usage
            log_usage(
                supabase=self.supabase,
                user_id=params.user_id,
                app_id=self.app_id,
                feature_id=params.feature_id,
                provider='anthropic',
                model=model_id,
                tokens_in=0,
                tokens_out=0,
                cost_usd=0,
                latency_ms=latency_ms,
                success=False,
                error_code=error_code,
                key_source='managed',
            )

            # Re-raise the error
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

        try:
            # Resolve the model info
            model = get_model(model_id, self.supabase)

            # Use managed key from environment variable (S17 will add BYOK)
            api_key = os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                raise ValueError('ANTHROPIC_API_KEY environment variable not set')

            key_source = 'managed'

            # Create Anthropic client
            client = Anthropic(api_key=api_key)

            # Convert our Message format to Anthropic format
            messages = [
                {'role': msg.role, 'content': msg.content}
                for msg in params.messages
            ]

            # Build request parameters
            request_params = {
                'model': model_id,
                'max_tokens': params.max_tokens or model.max_output_tokens,
                'messages': messages,
            }

            if params.temperature is not None:
                request_params['temperature'] = params.temperature

            # Yield start signal
            yield ChatChunk(delta=ChatChunkDelta(type='start_stream'))

            # Start streaming
            partial_tokens_in = 0
            partial_tokens_out = 0

            with client.messages.stream(**request_params) as stream:
                for event in stream:
                    # Handle text deltas
                    if event.type == 'content_block_delta':
                        if hasattr(event.delta, 'text'):
                            yield ChatChunk(
                                delta=ChatChunkDelta(type='text_delta', text=event.delta.text)
                            )

                    # Track token usage from message_delta events
                    elif event.type == 'message_delta':
                        if hasattr(event, 'usage'):
                            partial_tokens_out = event.usage.output_tokens

                # Get final message for full token counts
                final_message = stream.get_final_message()
                tokens_in = final_message.usage.input_tokens
                tokens_out = final_message.usage.output_tokens

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
                provider='anthropic',
                model=model_id,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost_usd=cost_usd,
                latency_ms=latency_ms,
                success=True,
                key_source=key_source,
            )

        except Exception as error:
            # Calculate latency for error case
            latency_ms = int((time.time() - start_time) * 1000)

            # Map error types
            error_code = 'UNKNOWN'
            if hasattr(error, 'status_code'):
                status = error.status_code
                if status == 401:
                    error_code = 'AUTHENTICATION_ERROR'
                elif status == 429:
                    error_code = 'RATE_LIMIT'
                elif status >= 500:
                    error_code = 'PROVIDER_ERROR'

            # Log failed usage
            log_usage(
                supabase=self.supabase,
                user_id=params.user_id,
                app_id=self.app_id,
                feature_id=params.feature_id,
                provider='anthropic',
                model=model_id,
                tokens_in=0,
                tokens_out=0,
                cost_usd=0,
                latency_ms=latency_ms,
                success=False,
                error_code=error_code,
                key_source='managed',
            )

            # Re-raise the error
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
