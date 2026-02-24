"""
Usage logging to Supabase

Fire-and-forget logging of all AI calls to ai_usage_log table.
"""

from typing import Any, Optional


async def log_usage(
    supabase: Any,
    user_id: str,
    app_id: str,
    feature_id: str,
    provider: str,
    model: str,
    tokens_in: int,
    tokens_out: int,
    cost_usd: float,
    latency_ms: float,
    success: bool,
    error_code: Optional[str] = None,
    key_source: str = 'managed',
    org_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    """
    Log AI usage to Supabase

    Fire-and-forget: errors are logged but not raised.

    Args:
        supabase: Supabase client
        user_id: User UUID
        app_id: Application identifier
        feature_id: Feature identifier
        provider: LLM provider (e.g., 'anthropic')
        model: Model identifier
        tokens_in: Input token count
        tokens_out: Output token count
        cost_usd: Cost in USD
        latency_ms: Call latency in milliseconds
        success: Whether the call succeeded
        error_code: Optional error code if failed
        key_source: 'byok' or 'managed'
        org_id: Optional organization UUID
        metadata: Optional additional metadata
    """
    raise NotImplementedError("log_usage() will be implemented in S16")
