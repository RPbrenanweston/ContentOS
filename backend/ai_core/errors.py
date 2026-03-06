"""
Error classification utilities

Extracted from providers.py for Single Responsibility:
error classification belongs with error handling, not provider adapters.
"""

# @crumb
# @id           sal-py-errors-classifier
# @intent       Normalize heterogeneous provider HTTP errors into stable string codes so retry
#               and client logic can branch on error type without parsing exception internals
# @responsibilities
#               - Classify provider exceptions by HTTP status code into named error types
# @contracts    in: Exception | out: AUTHENTICATION_ERROR | RATE_LIMIT | INVALID_REQUEST |
#               PROVIDER_ERROR | UNKNOWN
# @hazards      Falls through to UNKNOWN for any unrecognized status — callers must handle
#               UNKNOWN gracefully or silent failures occur; checks both status_code and status
#               attrs to handle provider SDK inconsistency — could misclassify if neither attr
#               is present (returns UNKNOWN silently)
# @area         ERR
# @refs         backend/ai_core/retry.py, backend/ai_core/providers.py
# @prompt       Should UNKNOWN errors trigger an alert or surface to the caller as-is?


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
