"""
Basic package structure tests

Verifies that all modules import correctly and public API is accessible.
"""

import pytest


def test_types_import():
    """Verify types module imports"""
    from ai_core.types import (
        Message,
        Tool,
        ChatParams,
        ChatResult,
        ChatChunk,
        GenerateParams,
        UsageSummary,
        CreditBalance,
        DateRange,
        ModelInfo,
        AIClientConfig,
    )
    assert Message is not None
    assert Tool is not None
    assert ChatParams is not None


def test_client_import():
    """Verify client module imports"""
    from ai_core.client import AIClient, create_ai_client
    assert AIClient is not None
    assert create_ai_client is not None


def test_models_import():
    """Verify models module imports"""
    from ai_core.models import get_model, get_default_model, calculate_cost
    assert get_model is not None
    assert calculate_cost is not None


def test_billing_import():
    """Verify billing module imports"""
    from ai_core.billing import get_remaining_credits, check_credits
    assert get_remaining_credits is not None


def test_keys_import():
    """Verify keys module imports"""
    from ai_core.keys import resolve_key, save_key, delete_key, validate_key
    assert resolve_key is not None


def test_usage_import():
    """Verify usage module imports"""
    from ai_core.usage import log_usage
    assert log_usage is not None


def test_public_api():
    """Verify __init__.py exports all expected symbols"""
    import ai_core
    # Client
    assert hasattr(ai_core, 'AIClient')
    assert hasattr(ai_core, 'create_ai_client')
    # Types
    assert hasattr(ai_core, 'ChatParams')
    assert hasattr(ai_core, 'ChatResult')
    assert hasattr(ai_core, 'Message')
    # Models
    assert hasattr(ai_core, 'get_model')
    assert hasattr(ai_core, 'calculate_cost')
    # Billing
    assert hasattr(ai_core, 'get_remaining_credits')
    # Keys
    assert hasattr(ai_core, 'resolve_key')
    # Usage
    assert hasattr(ai_core, 'log_usage')


def test_pydantic_message_validation():
    """Verify Pydantic models validate correctly"""
    from ai_core.types import Message

    # Valid message
    msg = Message(role='user', content='Hello')
    assert msg.role == 'user'
    assert msg.content == 'Hello'

    # Invalid role should raise validation error
    with pytest.raises(Exception):  # Pydantic ValidationError
        Message(role='invalid', content='test')  # type: ignore


def test_pydantic_chat_params_validation():
    """Verify ChatParams validates correctly"""
    from ai_core.types import ChatParams, Message

    params = ChatParams(
        user_id='user-123',
        feature_id='test-feature',
        messages=[Message(role='user', content='test')]
    )
    assert params.user_id == 'user-123'
    assert len(params.messages) == 1
