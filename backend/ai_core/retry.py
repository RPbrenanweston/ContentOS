"""
Retry utilities with exponential backoff

Extracted from providers.py for Single Responsibility:
retry logic is a cross-cutting concern, not specific to provider adapters.
"""

import time
import random


def is_retryable_error(error: Exception) -> bool:
    """Determine if an error is retryable (429 rate limit or 5xx server errors)"""
    status = getattr(error, 'status_code', None) or getattr(error, 'status', None)
    if status == 429:
        return True
    if status and status >= 500:
        return True
    return False


def calculate_backoff_delay(attempt: int, base_delay_ms: float, jitter_factor: float) -> float:
    """Calculate exponential backoff delay with jitter (in seconds)"""
    exponential_delay = (2 ** attempt) * base_delay_ms
    jitter = random.random() * jitter_factor * exponential_delay
    return (exponential_delay + jitter) / 1000  # Convert ms to seconds


DEFAULT_RETRY_CONFIG = {
    'max_retries': 3,
    'base_delay_ms': 100,
    'jitter_factor': 0.1,
}


def retry_with_backoff(
    operation,
    max_retries: int = 3,
    base_delay_ms: float = 100,
    jitter_factor: float = 0.1,
):
    """
    Execute an operation with retry logic using exponential backoff.

    Args:
        operation: Callable that performs the operation
        max_retries: Maximum number of retry attempts
        base_delay_ms: Base delay in milliseconds
        jitter_factor: Jitter factor for randomizing delay

    Returns:
        Result of the operation

    Raises:
        The last error if all retries are exhausted
    """
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            return operation()
        except Exception as error:
            last_error = error

            if not is_retryable_error(error):
                raise

            if attempt == max_retries:
                raise

            delay = calculate_backoff_delay(attempt, base_delay_ms, jitter_factor)
            time.sleep(delay)

    # Should never reach here, but just in case
    raise last_error
