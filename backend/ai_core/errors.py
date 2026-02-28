"""
Error classification utilities

Extracted from providers.py for Single Responsibility:
error classification belongs with error handling, not provider adapters.
"""


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
