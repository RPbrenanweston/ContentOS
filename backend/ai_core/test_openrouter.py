"""
Tests for OpenAI and OpenRouter provider support in Python AI client
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from ai_core.client import create_ai_client, AIClient
from ai_core.types import ChatParams, Message, ChatResult, ChatChunk
from ai_core.models import ModelInfo
from ai_core.sync import sync_openrouter_models


@pytest.fixture
def mock_supabase():
    """Create mock Supabase client for synchronous Python SDK"""
    mock = Mock()
    return mock


@pytest.fixture
def mock_openai_model():
    """Create mock OpenAI ModelInfo"""
    return ModelInfo(
        id='gpt-4o',
        provider='openai',
        display_name='GPT-4o',
        cost_per_input_token=0.000005,
        cost_per_output_token=0.000015,
        max_context_tokens=128000,
        max_output_tokens=4096,
        supports_streaming=True,
        supports_tools=True,
        is_default=False,
        is_active=True,
    )


@pytest.fixture
def mock_openrouter_model():
    """Create mock OpenRouter ModelInfo"""
    return ModelInfo(
        id='google/gemini-2.0-flash-001',
        provider='openrouter',
        display_name='Gemini 2.0 Flash',
        cost_per_input_token=0.0000001,
        cost_per_output_token=0.0000004,
        max_context_tokens=1000000,
        max_output_tokens=8192,
        supports_streaming=True,
        supports_tools=True,
        is_default=False,
        is_active=True,
    )


# ============================================================================
# TESTS: chat() with OpenAI provider
# ============================================================================

@pytest.mark.asyncio
async def test_chat_openai_provider(mock_supabase, mock_openai_model):
    """Test chat() with OpenAI provider uses correct client and format"""
    # Mock the model query
    execute_mock = Mock()
    execute_mock.data = mock_openai_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    # Mock OpenAI SDK response
    mock_response = Mock()
    mock_response.choices = [Mock(message=Mock(content='OpenAI response text'))]
    mock_response.usage = Mock(prompt_tokens=15, completion_tokens=25)

    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-openai-key'}):
        with patch('ai_core.client.OpenAI') as MockOpenAI:
            mock_client_instance = Mock()
            mock_client_instance.chat.completions.create = Mock(return_value=mock_response)
            MockOpenAI.return_value = mock_client_instance

            # Create client and make chat call
            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            result = await client.chat(
                ChatParams(
                    user_id='user123',
                    feature_id='test-openai',
                    messages=[Message(role='user', content='Test OpenAI')],
                    model='gpt-4o',
                )
            )

            # Verify OpenAI client was created (no base_url argument)
            MockOpenAI.assert_called_once_with(api_key='test-openai-key')

            # Verify result
            assert isinstance(result, ChatResult)
            assert result.content == 'OpenAI response text'
            assert result.usage.tokens_in == 15
            assert result.usage.tokens_out == 25
            assert result.model == 'gpt-4o'


@pytest.mark.asyncio
async def test_chat_openai_message_format(mock_supabase, mock_openai_model):
    """Test that messages are converted to OpenAI format"""
    execute_mock = Mock()
    execute_mock.data = mock_openai_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    mock_response = Mock()
    mock_response.choices = [Mock(message=Mock(content='Response'))]
    mock_response.usage = Mock(prompt_tokens=10, completion_tokens=20)

    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        with patch('ai_core.client.OpenAI') as MockOpenAI:
            mock_client_instance = Mock()
            mock_client_instance.chat.completions.create = Mock(return_value=mock_response)
            MockOpenAI.return_value = mock_client_instance

            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            await client.chat(
                ChatParams(
                    user_id='user123',
                    feature_id='test',
                    messages=[
                        Message(role='user', content='Hello'),
                        Message(role='assistant', content='Hi'),
                        Message(role='user', content='How are you?'),
                    ],
                    model='gpt-4o',
                )
            )

            # Verify message format conversion
            call_args = mock_client_instance.chat.completions.create.call_args
            messages_arg = call_args[1]['messages']
            assert messages_arg == [
                {'role': 'user', 'content': 'Hello'},
                {'role': 'assistant', 'content': 'Hi'},
                {'role': 'user', 'content': 'How are you?'},
            ]


@pytest.mark.asyncio
async def test_chat_openai_logs_correct_provider(mock_supabase, mock_openai_model):
    """Test that usage logging records 'openai' as provider"""
    execute_mock = Mock()
    execute_mock.data = mock_openai_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    # Track insert calls
    insert_mock = Mock()
    mock_supabase.table().insert.return_value.execute.return_value = insert_mock

    mock_response = Mock()
    mock_response.choices = [Mock(message=Mock(content='Response'))]
    mock_response.usage = Mock(prompt_tokens=10, completion_tokens=20)

    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        with patch('ai_core.client.OpenAI') as MockOpenAI:
            mock_client_instance = Mock()
            mock_client_instance.chat.completions.create = Mock(return_value=mock_response)
            MockOpenAI.return_value = mock_client_instance

            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            await client.chat(
                ChatParams(
                    user_id='user123',
                    feature_id='test',
                    messages=[Message(role='user', content='Test')],
                    model='gpt-4o',
                )
            )

            # Verify usage logging was called
            insert_calls = mock_supabase.table().insert.call_args_list
            assert len(insert_calls) > 0

            # Verify provider field in usage log
            usage_log = insert_calls[0][0][0]
            assert usage_log['provider'] == 'openai'


# ============================================================================
# TESTS: chat() with OpenRouter provider
# ============================================================================

@pytest.mark.asyncio
async def test_chat_openrouter_provider(mock_supabase, mock_openrouter_model):
    """Test chat() with OpenRouter provider uses correct base_url"""
    execute_mock = Mock()
    execute_mock.data = mock_openrouter_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    mock_response = Mock()
    mock_response.choices = [Mock(message=Mock(content='OpenRouter response'))]
    mock_response.usage = Mock(prompt_tokens=12, completion_tokens=18)

    with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-openrouter-key'}):
        with patch('ai_core.client.OpenAI') as MockOpenAI:
            mock_client_instance = Mock()
            mock_client_instance.chat.completions.create = Mock(return_value=mock_response)
            MockOpenAI.return_value = mock_client_instance

            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            result = await client.chat(
                ChatParams(
                    user_id='user123',
                    feature_id='test-openrouter',
                    messages=[Message(role='user', content='Test OpenRouter')],
                    model='google/gemini-2.0-flash-001',
                )
            )

            # Verify OpenAI client was created WITH base_url for OpenRouter
            MockOpenAI.assert_called_once_with(
                api_key='test-openrouter-key',
                base_url='https://openrouter.ai/api/v1'
            )

            # Verify result
            assert isinstance(result, ChatResult)
            assert result.content == 'OpenRouter response'
            assert result.usage.tokens_in == 12
            assert result.usage.tokens_out == 18


@pytest.mark.asyncio
async def test_chat_openrouter_logs_correct_provider(mock_supabase, mock_openrouter_model):
    """Test that usage logging records 'openrouter' as provider"""
    execute_mock = Mock()
    execute_mock.data = mock_openrouter_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    insert_mock = Mock()
    mock_supabase.table().insert.return_value.execute.return_value = insert_mock

    mock_response = Mock()
    mock_response.choices = [Mock(message=Mock(content='Response'))]
    mock_response.usage = Mock(prompt_tokens=10, completion_tokens=20)

    with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
        with patch('ai_core.client.OpenAI') as MockOpenAI:
            mock_client_instance = Mock()
            mock_client_instance.chat.completions.create = Mock(return_value=mock_response)
            MockOpenAI.return_value = mock_client_instance

            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            await client.chat(
                ChatParams(
                    user_id='user123',
                    feature_id='test',
                    messages=[Message(role='user', content='Test')],
                    model='google/gemini-2.0-flash-001',
                )
            )

            # Verify provider field in usage log
            insert_calls = mock_supabase.table().insert.call_args_list
            usage_log = insert_calls[0][0][0]
            assert usage_log['provider'] == 'openrouter'


@pytest.mark.asyncio
async def test_chat_openrouter_provider_detection(mock_supabase, mock_openrouter_model):
    """Test provider detection from model registry (not hardcoded)"""
    execute_mock = Mock()
    execute_mock.data = mock_openrouter_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    mock_response = Mock()
    mock_response.choices = [Mock(message=Mock(content='Response'))]
    mock_response.usage = Mock(prompt_tokens=10, completion_tokens=20)

    with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
        with patch('ai_core.client.OpenAI') as MockOpenAI:
            mock_client_instance = Mock()
            mock_client_instance.chat.completions.create = Mock(return_value=mock_response)
            MockOpenAI.return_value = mock_client_instance

            # Spy on get_model to verify it's being called
            with patch('ai_core.client.get_model', wraps=lambda mid, sb: mock_openrouter_model) as mock_get_model:
                client = create_ai_client(app_id='test_app', supabase=mock_supabase)
                await client.chat(
                    ChatParams(
                        user_id='user123',
                        feature_id='test',
                        messages=[Message(role='user', content='Test')],
                        model='google/gemini-2.0-flash-001',
                    )
                )

                # Verify get_model was called (provider not hardcoded)
                mock_get_model.assert_called_once()


# ============================================================================
# TESTS: chat_stream() with OpenAI and OpenRouter
# ============================================================================

@pytest.mark.asyncio
async def test_chat_stream_openai(mock_supabase, mock_openai_model):
    """Test chat_stream() with OpenAI provider"""
    execute_mock = Mock()
    execute_mock.data = mock_openai_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    # Mock OpenAI streaming chunks
    chunk1 = Mock()
    chunk1.choices = [Mock(delta=Mock(content='Hello'))]
    chunk1.usage = None

    chunk2 = Mock()
    chunk2.choices = [Mock(delta=Mock(content=' world'))]
    chunk2.usage = None

    final_chunk = Mock()
    final_chunk.choices = [Mock(delta=Mock(content=None))]
    final_chunk.usage = Mock(prompt_tokens=5, completion_tokens=2)

    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        with patch('ai_core.client.OpenAI') as MockOpenAI:
            mock_client_instance = Mock()
            mock_client_instance.chat.completions.create.return_value = iter([chunk1, chunk2, final_chunk])
            MockOpenAI.return_value = mock_client_instance

            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            chunks = []
            async for chunk in client.chat_stream(
                ChatParams(
                    user_id='user123',
                    feature_id='test-stream',
                    messages=[Message(role='user', content='Stream test')],
                    model='gpt-4o',
                )
            ):
                chunks.append(chunk)

            # Verify chunk structure
            assert len(chunks) >= 3  # start, text_deltas, stop
            assert chunks[0].delta.type == 'start_stream'
            assert chunks[-1].delta.type == 'stop_stream'
            assert chunks[-1].partial_tokens.tokens_in == 5
            assert chunks[-1].partial_tokens.tokens_out == 2


@pytest.mark.asyncio
async def test_chat_stream_openrouter(mock_supabase, mock_openrouter_model):
    """Test chat_stream() with OpenRouter provider uses correct base_url"""
    execute_mock = Mock()
    execute_mock.data = mock_openrouter_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    chunk = Mock()
    chunk.choices = [Mock(delta=Mock(content='Test'))]
    chunk.usage = None

    final_chunk = Mock()
    final_chunk.choices = [Mock(delta=Mock(content=None))]
    final_chunk.usage = Mock(prompt_tokens=8, completion_tokens=4)

    with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
        with patch('ai_core.client.OpenAI') as MockOpenAI:
            mock_client_instance = Mock()
            mock_client_instance.chat.completions.create.return_value = iter([chunk, final_chunk])
            MockOpenAI.return_value = mock_client_instance

            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            chunks = []
            async for c in client.chat_stream(
                ChatParams(
                    user_id='user123',
                    feature_id='test-stream',
                    messages=[Message(role='user', content='Stream')],
                    model='google/gemini-2.0-flash-001',
                )
            ):
                chunks.append(c)

            # Verify OpenRouter base_url was used
            MockOpenAI.assert_called_once_with(
                api_key='test-key',
                base_url='https://openrouter.ai/api/v1'
            )

            # Verify chunks
            assert chunks[0].delta.type == 'start_stream'
            assert chunks[-1].delta.type == 'stop_stream'


@pytest.mark.asyncio
async def test_chat_stream_openai_extracts_text_delta(mock_supabase, mock_openai_model):
    """Test text_delta extraction from chunk.choices[0].delta.content"""
    execute_mock = Mock()
    execute_mock.data = mock_openai_model.model_dump()
    mock_supabase.table().select().eq().eq().single().execute.return_value = execute_mock

    chunk = Mock()
    chunk.choices = [Mock(delta=Mock(content='Delta text here'))]
    chunk.usage = None

    final_chunk = Mock()
    final_chunk.choices = [Mock(delta=Mock(content=None))]
    final_chunk.usage = Mock(prompt_tokens=3, completion_tokens=1)

    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        with patch('ai_core.client.OpenAI') as MockOpenAI:
            mock_client_instance = Mock()
            mock_client_instance.chat.completions.create.return_value = iter([chunk, final_chunk])
            MockOpenAI.return_value = mock_client_instance

            client = create_ai_client(app_id='test_app', supabase=mock_supabase)
            chunks = []
            async for c in client.chat_stream(
                ChatParams(
                    user_id='user123',
                    feature_id='test',
                    messages=[Message(role='user', content='Test')],
                    model='gpt-4o',
                )
            ):
                chunks.append(c)

            # Find text_delta chunk
            text_deltas = [c for c in chunks if c.delta.type == 'text_delta']
            assert len(text_deltas) == 1
            assert text_deltas[0].delta.text == 'Delta text here'


# ============================================================================
# TESTS: sync_openrouter_models()
# ============================================================================

def test_sync_openrouter_models_insert_new(mock_supabase):
    """Test sync function inserts new models"""
    # Mock existing models query (no existing models)
    execute_existing = Mock()
    execute_existing.data = []
    mock_supabase.from_().select().eq().execute.return_value = execute_existing

    # Mock API response
    api_response = {
        'data': [
            {
                'id': 'test/model-1',
                'name': 'Test Model 1',
                'pricing': {'prompt': '0.000001', 'completion': '0.000002'},
                'context_length': 8000,
                'top_provider': {'max_completion_tokens': 4000},
            }
        ]
    }

    # Mock upsert
    mock_supabase.from_().upsert().execute.return_value = Mock()

    with patch('ai_core.sync.requests.get') as mock_get:
        mock_get.return_value = Mock(ok=True, json=lambda: api_response)

        result = sync_openrouter_models(mock_supabase)

        assert result['inserted'] == 1
        assert result['updated'] == 0
        assert result['deactivated'] == 0


def test_sync_openrouter_models_update_existing(mock_supabase):
    """Test sync function updates existing models"""
    # Mock existing models query
    execute_existing = Mock()
    execute_existing.data = [{'id': 'test/model-1'}]
    mock_supabase.from_().select().eq().execute.return_value = execute_existing

    # Mock API response (same model, different pricing)
    api_response = {
        'data': [
            {
                'id': 'test/model-1',
                'name': 'Test Model 1 Updated',
                'pricing': {'prompt': '0.000005', 'completion': '0.000010'},
                'context_length': 16000,
                'top_provider': {'max_completion_tokens': 8000},
            }
        ]
    }

    mock_supabase.from_().upsert().execute.return_value = Mock()

    with patch('ai_core.sync.requests.get') as mock_get:
        mock_get.return_value = Mock(ok=True, json=lambda: api_response)

        result = sync_openrouter_models(mock_supabase)

        assert result['inserted'] == 0
        assert result['updated'] == 1
        assert result['deactivated'] == 0


def test_sync_openrouter_models_deactivate_removed(mock_supabase):
    """Test sync function deactivates models no longer in API"""
    # Mock existing models query
    execute_existing = Mock()
    execute_existing.data = [{'id': 'test/old-model'}, {'id': 'test/model-1'}]
    mock_supabase.from_().select().eq().execute.return_value = execute_existing

    # Mock API response (only model-1, old-model removed)
    api_response = {
        'data': [
            {
                'id': 'test/model-1',
                'name': 'Test Model 1',
                'pricing': {'prompt': '0.000001', 'completion': '0.000002'},
                'context_length': 8000,
                'top_provider': {'max_completion_tokens': 4000},
            }
        ]
    }

    mock_supabase.from_().upsert().execute.return_value = Mock()
    mock_supabase.from_().update().in_().execute.return_value = Mock()

    with patch('ai_core.sync.requests.get') as mock_get:
        mock_get.return_value = Mock(ok=True, json=lambda: api_response)

        result = sync_openrouter_models(mock_supabase)

        assert result['deactivated'] == 1
        # Verify update was called with is_active=False
        update_calls = mock_supabase.from_().update.call_args_list
        assert len(update_calls) > 0


def test_sync_openrouter_models_skips_zero_pricing(mock_supabase):
    """Test sync skips models with missing or zero pricing"""
    execute_existing = Mock()
    execute_existing.data = []
    mock_supabase.from_().select().eq().execute.return_value = execute_existing

    # API response with invalid pricing
    api_response = {
        'data': [
            {
                'id': 'test/free-model',
                'name': 'Free Model',
                'pricing': {'prompt': '0', 'completion': '0'},
                'context_length': 8000,
            },
            {
                'id': 'test/valid-model',
                'name': 'Valid Model',
                'pricing': {'prompt': '0.000001', 'completion': '0.000002'},
                'context_length': 8000,
            }
        ]
    }

    mock_supabase.from_().upsert().execute.return_value = Mock()

    with patch('ai_core.sync.requests.get') as mock_get:
        mock_get.return_value = Mock(ok=True, json=lambda: api_response)

        result = sync_openrouter_models(mock_supabase)

        # Only valid-model should be inserted
        assert result['inserted'] == 1


def test_sync_openrouter_models_handles_api_error(mock_supabase):
    """Test sync handles API errors gracefully"""
    with patch('ai_core.sync.requests.get') as mock_get:
        mock_get.return_value = Mock(ok=False, status_code=500, reason='Internal Server Error')

        with pytest.raises(Exception, match='OpenRouter API error'):
            sync_openrouter_models(mock_supabase)


def test_sync_openrouter_models_maps_fields_correctly(mock_supabase):
    """Test field mapping matches TypeScript version"""
    execute_existing = Mock()
    execute_existing.data = []
    mock_supabase.from_().select().eq().execute.return_value = execute_existing

    api_response = {
        'data': [
            {
                'id': 'provider/model-name',
                'name': 'Display Name Here',
                'pricing': {'prompt': '0.000003', 'completion': '0.000015'},
                'context_length': 200000,
                'top_provider': {'max_completion_tokens': 8192},
            }
        ]
    }

    upsert_calls = []
    def capture_upsert(data, **kwargs):
        upsert_calls.append(data)
        return Mock(execute=Mock(return_value=Mock()))

    mock_supabase.from_().upsert.side_effect = capture_upsert

    with patch('ai_core.sync.requests.get') as mock_get:
        mock_get.return_value = Mock(ok=True, json=lambda: api_response)

        sync_openrouter_models(mock_supabase)

        # Verify field mapping
        assert len(upsert_calls) == 1
        model_row = upsert_calls[0]
        assert model_row['id'] == 'provider/model-name'
        assert model_row['provider'] == 'openrouter'
        assert model_row['display_name'] == 'Display Name Here'
        assert model_row['cost_per_input_token'] == 0.000003
        assert model_row['cost_per_output_token'] == 0.000015
        assert model_row['max_context_tokens'] == 200000
        assert model_row['max_output_tokens'] == 8192
        assert model_row['is_active'] is True
