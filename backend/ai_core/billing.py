"""
Credit balance and spending cap enforcement

Functions to check credits, enforce caps, and prevent overspending.
"""

from typing import Any
from .types import CreditBalance


async def get_remaining_credits(user_id: str, supabase: Any) -> CreditBalance:
    """
    Get remaining credit balance for current period

    Args:
        user_id: User UUID
        supabase: Supabase client

    Returns:
        CreditBalance with remaining and used amounts
    """
    raise NotImplementedError("get_remaining_credits() will be implemented in S16")


async def check_credits(
    user_id: str,
    estimated_cost_usd: float,
    supabase: Any,
    key_source: str = 'managed'
) -> None:
    """
    Pre-check that user has sufficient credits

    Only checks for managed keys (BYOK users skip this).

    Args:
        user_id: User UUID
        estimated_cost_usd: Estimated cost for the upcoming call
        supabase: Supabase client
        key_source: 'byok' or 'managed'

    Raises:
        InsufficientCreditsError: If balance too low
        SpendingCapExceededError: If spending cap reached
    """
    raise NotImplementedError("check_credits() will be implemented in S16")
