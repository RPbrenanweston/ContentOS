"""
Usage logging to Supabase

Fire-and-forget logging of all AI calls to ai_usage_log table.
"""
#
# @crumb
# @id sal-py-usage-logger
# @intent Record every AI call's token consumption and cost to Supabase for billing
#         reconciliation and usage analytics — failures are swallowed to never block callers.
# @responsibilities
#   - Build usage log row with user, model, cost, and timing data
#   - Insert to ai_usage_log table via Supabase client
#   - Swallow all exceptions to maintain fire-and-forget contract
# @contracts
#   - Never raises — all exceptions caught and printed to stdout
#   - created_at always set to UTC ISO timestamp at call time
#   - metadata defaults to empty dict if None
# @hazards
#   - Silent exception swallowing means usage data loss goes undetected
#   - print() for error logging — not captured by structured logging systems
# @area OBS
# @refs client.py, types.py
# @trail chat-flow#6 | Log token consumption after provider call completes
# @trail billing-flow#2 | Record cost data for billing reconciliation
# @crumbfn log_usage | Insert usage row to Supabase | silently swallows all errors +L11-L72
# @prompt If Supabase is down during high traffic, how much usage data could be lost silently?
# @/crumb
#

from typing import Any, Optional
from datetime import datetime, timezone


def log_usage(
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
    try:
        data = {
            'user_id': user_id,
            'org_id': org_id,
            'app_id': app_id,
            'feature_id': feature_id,
            'provider': provider,
            'model': model,
            'tokens_in': tokens_in,
            'tokens_out': tokens_out,
            'cost_usd': cost_usd,
            'latency_ms': latency_ms,
            'success': success,
            'error_code': error_code,
            'key_source': key_source,
            'metadata': metadata or {},
            'created_at': datetime.now(timezone.utc).isoformat(),
        }

        supabase.from_('ai_usage_log').insert(data).execute()
    except Exception as e:
        # Fire-and-forget: log error but don't raise
        print(f'Error logging AI usage: {e}')
