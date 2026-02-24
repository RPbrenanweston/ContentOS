"""
AI client for LLM API calls

Handles chat, streaming, and structured generation with automatic
usage logging, key resolution, and credit checks.
"""

from typing import Any, AsyncIterable, Optional
from .types import ChatParams, ChatResult, ChatChunk, GenerateParams, AIClientConfig


class AIClient:
    """Main AI client for making LLM calls"""

    def __init__(self, config: AIClientConfig):
        self.config = config
        self.app_id = config.app_id
        self.supabase = config.supabase_client
        self.default_model = config.default_model

    async def chat(self, params: ChatParams) -> ChatResult:
        """
        Make a chat completion call

        Args:
            params: Chat parameters including user_id, feature_id, and messages

        Returns:
            ChatResult with content, usage, and metadata
        """
        raise NotImplementedError("chat() will be implemented in S16")

    async def chat_stream(self, params: ChatParams) -> AsyncIterable[ChatChunk]:
        """
        Make a streaming chat completion call

        Args:
            params: Chat parameters including user_id, feature_id, and messages

        Yields:
            ChatChunk objects with delta text and partial token counts
        """
        raise NotImplementedError("chat_stream() will be implemented in S16")
        # Make mypy happy with unreachable yield
        if False:
            yield ChatChunk(delta={'type': 'start_stream'})  # type: ignore

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
