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
    PartialTokens,
)
from .models import get_model, get_default_model, calculate_cost
from .billing import get_remaining_credits, check_credits
from .keys import resolve_key, save_key, delete_key, validate_key, encrypt, decrypt
from .usage import log_usage

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
]
