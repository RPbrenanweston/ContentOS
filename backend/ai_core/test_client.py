"""
Tests for Python AI client
"""

import pytest
from unittest.mock import Mock, patch
from ai_core.client import create_ai_client, AIClient
from ai_core.types import ChatParams, Message, ChatResult
from ai_core.models import ModelInfo


@pytest.fixture
def mock_supabase():
    """Create mock Supabase client for synchronous Python SDK"""
    mock = Mock()
    return mock


@pytest.fixture
def mock_model():
    """Create mock ModelInfo"""
    return ModelInfo(
        id='claude-sonnet-4-20250514',
        provider='anthropic',
        display_name='Claude Sonnet 4',
        cost_per_input_token=0.000003,
        cost_per_output_token=0.000015,
        max_context_tokens=200000,
        max_output_tokens=8192,
        supports_streaming=True,
        supports_tools=True,
        is_default=True,
        is_active=True,
    )


@pytest.mark.asyncio
async def test_create_ai_client(mock_supabase):
    """Test that create_ai_client factory works"""
    client = create_ai_client(
        app_id='test_app',
        supabase=mock_supabase,
    )

    assert isinstance(client, AIClient)
    assert client.app_id == 'test_app'
    assert client.supabase == mock_supabase


@pytest.mark.asyncio
async def test_chat_basic_flow(mock_supabase, mock_model):
    """Test basic chat call flow with mocked Anthropic SDK"""
    # Mock the model query - Python Supabase SDK is synchronous
    execute_mock = Mock()
    execute_mock.data = mock_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    # Mock Anthropic SDK response
    mock_response = Mock()
    mock_response.content = [Mock(type='text', text='This is the response')]
    mock_response.usage = Mock(input_tokens=10, output_tokens=20)

    with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
        with patch('ai_core.client.Anthropic') as MockAnthropic:
            mock_client_instance = Mock()
            mock_client_instance.messages.create = Mock(return_value=mock_response)
            MockAnthropic.return_value = mock_client_instance

            # Create client and make chat call
            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            result = await client.chat(
                ChatParams(
                    user_id='user123',
                    feature_id='test-feature',
                    messages=[Message(role='user', content='Hello')]
                )
            )

            # Verify result
            assert isinstance(result, ChatResult)
            assert result.content == 'This is the response'
            assert result.usage.tokens_in == 10
            assert result.usage.tokens_out == 20
            assert result.model == 'claude-sonnet-4-20250514'


@pytest.mark.asyncio
async def test_chat_logs_usage(mock_supabase, mock_model):
    """Test that chat logs usage to Supabase"""
    # Mock the model query
    execute_mock = Mock()
    execute_mock.data = mock_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    # Mock Anthropic SDK response
    mock_response = Mock()
    mock_response.content = [Mock(type='text', text='Response')]
    mock_response.usage = Mock(input_tokens=10, output_tokens=20)

    # Track insert calls
    insert_calls = []

    def track_insert(data):
        insert_calls.append(data)
        mock_result = Mock()
        mock_result.execute = Mock()
        return mock_result

    mock_supabase.table().insert = track_insert

    with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
        with patch('ai_core.client.Anthropic') as MockAnthropic:
            mock_client_instance = Mock()
            mock_client_instance.messages.create = Mock(return_value=mock_response)
            MockAnthropic.return_value = mock_client_instance

            # Make chat call
            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            await client.chat(
                ChatParams(
                    user_id='user123',
                    feature_id='test-feature',
                    messages=[Message(role='user', content='Hello')]
                )
            )

            # Verify usage was logged
            assert len(insert_calls) >= 1
            logged_data = insert_calls[-1]
            assert logged_data['user_id'] == 'user123'
            assert logged_data['app_id'] == 'test_app'
            assert logged_data['feature_id'] == 'test-feature'
            assert logged_data['provider'] == 'anthropic'
            assert logged_data['tokens_in'] == 10
            assert logged_data['tokens_out'] == 20
            assert logged_data['success'] is True


@pytest.mark.asyncio
async def test_chat_handles_error(mock_supabase, mock_model):
    """Test that chat handles and logs errors"""
    # Mock the model query
    execute_mock = Mock()
    execute_mock.data = mock_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    # Track insert calls
    insert_calls = []

    def track_insert(data):
        insert_calls.append(data)
        mock_result = Mock()
        mock_result.execute = Mock()
        return mock_result

    mock_supabase.table().insert = track_insert

    with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
        with patch('ai_core.client.Anthropic') as MockAnthropic:
            # Mock API error
            mock_client_instance = Mock()
            error = Exception('API Error')
            error.status_code = 429
            mock_client_instance.messages.create = Mock(side_effect=error)
            MockAnthropic.return_value = mock_client_instance

            # Make chat call
            client = create_ai_client(app_id='test_app', supabase=mock_supabase)

            with pytest.raises(Exception):
                await client.chat(
                    ChatParams(
                        user_id='user123',
                        feature_id='test-feature',
                        messages=[Message(role='user', content='Hello')]
                    )
                )

            # Verify error usage was logged
            assert len(insert_calls) >= 1
            logged_data = insert_calls[-1]
            assert logged_data['success'] is False
            assert logged_data['error_code'] == 'RATE_LIMIT'
            assert logged_data['tokens_in'] == 0
            assert logged_data['tokens_out'] == 0
