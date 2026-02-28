"""
AI Core - Shared AI utility layer

Provides LLM access, usage tracking, billing, and key management.
"""

from .client import AIClient, create_ai_client
from .types import (
    AIClientConfig,
    ChatParams,
    ChatResult,
    ChatChunk,
    ChatChunkDelta,
    Message,
    Tool,
    UsageInfo,
    GenerateParams,
    UsageSummary,
    CreditBalance,
    DateRange,
    ModelInfo,
    ModelNotFoundError,
    PartialTokens,
)
from .models import get_model, get_default_model, calculate_cost
from .billing import get_remaining_credits, check_credits
from .keys import resolve_key, save_key, delete_key, validate_key, encrypt, decrypt
from .usage import log_usage
from .sync import sync_openrouter_models
from .retry import retry_with_backoff, is_retryable_error, calculate_backoff_delay
from .errors import classify_error
from .providers import get_adapter, register_adapter

__all__ = [
    # Client
    'AIClient',
    'create_ai_client',
    # Types
    'AIClientConfig',
    'ChatParams',
    'ChatResult',
    'ChatChunk',
    'ChatChunkDelta',
    'Message',
    'Tool',
    'UsageInfo',
    'GenerateParams',
    'UsageSummary',
    'CreditBalance',
    'DateRange',
    'ModelInfo',
    'ModelNotFoundError',
    'PartialTokens',
    # Models
    'get_model',
    'get_default_model',
    'calculate_cost',
    # Billing
    'get_remaining_credits',
    'check_credits',
    # Keys
    'resolve_key',
    'save_key',
    'delete_key',
    'validate_key',
    'encrypt',
    'decrypt',
    # Usage
    'log_usage',
    # Sync
    'sync_openrouter_models',
    # Retry utilities
    'retry_with_backoff',
    'is_retryable_error',
    'calculate_backoff_delay',
    # Error utilities
    'classify_error',
    # Provider registration
    'get_adapter',
    'register_adapter',
]
