"""
Credit balance and spending cap enforcement (Python)

STATUS: Not yet implemented. Use the TypeScript @org/ai-core package
for billing operations. The Python client currently operates without
pre-call credit checks.

The TypeScript implementation in packages/ai-core/src/billing.ts is
the reference for a future Python port.
"""

# @crumb
# @id           sal-py-billing-stub
# @intent       Placeholder for Python billing — enforces that credit checks route to the
#               TypeScript implementation; signals incomplete port to prevent accidental use
# @responsibilities
#               - Surface NotImplementedError for all billing calls
#               - Document the bridge gap to TS billing.ts
# @contracts    in: user_id + supabase client | out: raises NotImplementedError always
# @hazards      All functions unconditionally raise NotImplementedError — no credits are
#               checked on any Python path; Python client operates without billing enforcement,
#               risking unbounded spend if Python path bypasses TS
# @area         SEC
# @trail        chat-flow#3      | Pre-check credits before provider call (unimplemented)
# @trail        billing-flow#1   | Check and deduct user credit balance (unimplemented)
# @refs         packages/ai-core/src/billing.ts, backend/ai_core/types.py
# @prompt       When will this be ported to Python, and what is the interim enforcement strategy?
# @crumbfn get_remaining_credits | Stub — always raises; documents missing Python port | +L35-L48
# @crumbfn check_credits | Stub — always raises; chat-flow#3 enforcement absent in Python | +L51-L69

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
