"""
Credit balance and spending cap enforcement (Python)

STATUS: Not yet implemented. Use the TypeScript @org/ai-core package
for billing operations. The Python client currently operates without
pre-call credit checks.

The TypeScript implementation in packages/ai-core/src/billing.ts is
the reference for a future Python port.
"""

from typing import Any
from .types import CreditBalance


async def get_remaining_credits(user_id: str, supabase: Any) -> CreditBalance:
    """
    Get remaining credit balance for current period.

    NOT YET IMPLEMENTED in Python. The TypeScript equivalent
    (getRemainingCredits in billing.ts) is fully functional.

    Raises:
        NotImplementedError: Always — this function is not yet ported to Python.
    """
    raise NotImplementedError(
        "get_remaining_credits() is not yet implemented in Python. "
        "Use the TypeScript @org/ai-core package for billing queries."
    )


async def check_credits(
    user_id: str,
    estimated_cost_usd: float,
    supabase: Any,
    key_source: str = 'managed'
) -> None:
    """
    Pre-check that user has sufficient credits.

    NOT YET IMPLEMENTED in Python. The TypeScript equivalent
    (checkCredits + checkSpendingCap in billing.ts) is fully functional.

    Raises:
        NotImplementedError: Always — this function is not yet ported to Python.
    """
    raise NotImplementedError(
        "check_credits() is not yet implemented in Python. "
        "Use the TypeScript @org/ai-core package for billing enforcement."
    )
