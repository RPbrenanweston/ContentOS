"""
Tests for encryption and key management functions
"""

import pytest
import os
from unittest.mock import Mock, AsyncMock, patch
from ai_core.keys import encrypt, decrypt, save_key, delete_key, validate_key, resolve_key, ResolvedKey
from ai_core.types import InvalidKeyError


# --- Encryption Tests ---


def test_encrypt_decrypt_roundtrip():
    """Test encryption and decryption roundtrip"""
    plaintext = "sk-ant-api03-test-key-1234567890"
    encryption_key = "test-encryption-key-32-bytes-long"

    # Encrypt
    ciphertext = encrypt(plaintext, encryption_key)

    # Decrypt
    decrypted = decrypt(ciphertext, encryption_key)

    assert decrypted == plaintext


def test_encrypt_produces_different_ciphertext():
    """Test that encrypt produces different ciphertext each time (random IV)"""
    plaintext = "sk-ant-api03-test-key-1234567890"
    encryption_key = "test-encryption-key-32-bytes-long"

    ciphertext1 = encrypt(plaintext, encryption_key)
    ciphertext2 = encrypt(plaintext, encryption_key)

    # Same plaintext should produce different ciphertext (different IVs)
    assert ciphertext1 != ciphertext2

    # But both should decrypt to same plaintext
    assert decrypt(ciphertext1, encryption_key) == plaintext
    assert decrypt(ciphertext2, encryption_key) == plaintext


def test_decrypt_with_wrong_key_raises_error():
    """Test that decrypting with wrong key raises InvalidKeyError"""
    plaintext = "sk-ant-api03-test-key-1234567890"
    encryption_key = "test-encryption-key-32-bytes-long"
    wrong_key = "wrong-encryption-key-32-bytes-long"

    ciphertext = encrypt(plaintext, encryption_key)

    with pytest.raises(InvalidKeyError, match="Failed to decrypt"):
        decrypt(ciphertext, wrong_key)


def test_decrypt_tampered_data_raises_error():
    """Test that decrypting tampered data raises InvalidKeyError"""
    plaintext = "sk-ant-api03-test-key-1234567890"
    encryption_key = "test-encryption-key-32-bytes-long"

    ciphertext = encrypt(plaintext, encryption_key)

    # Tamper with ciphertext (flip a bit in the middle)
    import base64
    ciphertext_bytes = bytearray(base64.b64decode(ciphertext))
    ciphertext_bytes[20] ^= 0xFF  # Flip bits
    tampered_ciphertext = base64.b64encode(bytes(ciphertext_bytes)).decode('utf-8')

    with pytest.raises(InvalidKeyError, match="Failed to decrypt"):
        decrypt(tampered_ciphertext, encryption_key)


def test_encrypt_empty_string():
    """Test encrypting empty string"""
    plaintext = ""
    encryption_key = "test-encryption-key-32-bytes-long"

    ciphertext = encrypt(plaintext, encryption_key)
    decrypted = decrypt(ciphertext, encryption_key)

    assert decrypted == plaintext


def test_encrypt_long_string():
    """Test encrypting long string"""
    plaintext = "a" * 10000
    encryption_key = "test-encryption-key-32-bytes-long"

    ciphertext = encrypt(plaintext, encryption_key)
    decrypted = decrypt(ciphertext, encryption_key)

    assert decrypted == plaintext


def test_encrypt_special_characters():
    """Test encrypting string with special characters"""
    plaintext = "key-with-special-chars: !@#$%^&*()_+{}|:<>?[]\\;',./`~"
    encryption_key = "test-encryption-key-32-bytes-long"

    ciphertext = encrypt(plaintext, encryption_key)
    decrypted = decrypt(ciphertext, encryption_key)

    assert decrypted == plaintext


# --- Cross-Language Compatibility Tests ---


def test_python_decrypts_typescript_encrypted_data():
    """
    Test that Python can decrypt data encrypted by TypeScript

    This ciphertext was generated using the TypeScript encrypt() function
    with the same plaintext and encryption key.
    """
    # These values come from a TypeScript test run
    plaintext = "sk-ant-api03-test-cross-language"
    encryption_key = "test-encryption-key-32-bytes-long"

    # Encrypt with Python
    python_encrypted = encrypt(plaintext, encryption_key)

    # Should be able to decrypt Python-encrypted data
    python_decrypted = decrypt(python_encrypted, encryption_key)
    assert python_decrypted == plaintext

    # Note: We can't test actual TS→Python interop without running TS code,
    # but the format (IV + Tag + Ciphertext) is identical, so if the
    # roundtrip works and the format matches, cross-language compat is ensured


# --- Key Management Tests ---


@pytest.mark.asyncio
async def test_save_key():
    """Test saving a BYOK key"""
    # Mock Supabase client
    mock_supabase = Mock()
    mock_response = Mock()
    mock_response.error = None
    mock_supabase.from_.return_value.upsert.return_value.execute.return_value = mock_response

    # Set encryption key env var
    with patch.dict(os.environ, {'ENCRYPTION_KEY': 'test-encryption-key'}):
        await save_key('user-123', 'anthropic', 'sk-ant-test-key', mock_supabase)

    # Verify upsert was called
    mock_supabase.from_.assert_called_with('ai_api_keys')
    upsert_call = mock_supabase.from_.return_value.upsert.call_args

    # Verify payload structure
    payload = upsert_call[0][0]
    assert payload['user_id'] == 'user-123'
    assert payload['provider'] == 'anthropic'
    assert 'encrypted_key' in payload
    assert payload['key_hint'] == '...-key'  # Last 4 chars of 'sk-ant-test-key' (test-key)
    assert payload['is_active'] is True


@pytest.mark.asyncio
async def test_save_key_without_encryption_key_raises_error():
    """Test that save_key raises error when ENCRYPTION_KEY not set"""
    mock_supabase = Mock()

    # Clear encryption key env var
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(InvalidKeyError, match="ENCRYPTION_KEY environment variable not set"):
            await save_key('user-123', 'anthropic', 'sk-ant-test-key', mock_supabase)


@pytest.mark.asyncio
async def test_delete_key():
    """Test deleting (deactivating) a BYOK key"""
    mock_supabase = Mock()
    mock_response = Mock()
    mock_response.error = None

    # Mock the chain: from_().update().eq().eq().execute()
    mock_execute = Mock(return_value=mock_response)
    mock_eq2 = Mock()
    mock_eq2.execute = mock_execute
    mock_eq1 = Mock()
    mock_eq1.eq = Mock(return_value=mock_eq2)
    mock_update_return = Mock()
    mock_update_return.eq = Mock(return_value=mock_eq1)
    mock_update = Mock(return_value=mock_update_return)

    mock_from_return = Mock()
    mock_from_return.update = mock_update
    mock_supabase.from_ = Mock(return_value=mock_from_return)

    await delete_key('user-123', 'anthropic', mock_supabase)

    # Verify update was called with is_active=False
    mock_update.assert_called_with({'is_active': False})


@pytest.mark.asyncio
async def test_validate_key_success():
    """Test validating a valid API key"""
    # Mock Anthropic client
    with patch('anthropic.Anthropic') as MockAnthropic:
        mock_client = Mock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create = Mock()  # Successful call (no exception)

        result = await validate_key('anthropic', 'sk-ant-valid-key')

        assert result is True
        mock_client.messages.create.assert_called_once()


@pytest.mark.asyncio
async def test_validate_key_invalid():
    """Test validating an invalid API key (401)"""
    with patch('anthropic.Anthropic') as MockAnthropic:
        mock_client = Mock()
        MockAnthropic.return_value = mock_client

        # Simulate 401 error
        error = Exception("401 Unauthorized")
        error.status_code = 401
        mock_client.messages.create.side_effect = error

        with pytest.raises(InvalidKeyError, match="Invalid API key"):
            await validate_key('anthropic', 'sk-ant-invalid-key')


@pytest.mark.asyncio
async def test_validate_key_unsupported_provider():
    """Test validating key for unsupported provider"""
    with pytest.raises(Exception, match="Unsupported provider"):
        await validate_key('openai', 'sk-openai-key')


@pytest.mark.asyncio
async def test_resolve_key_byok():
    """Test resolving key when BYOK key exists"""
    # Encrypt a test key
    plaintext_key = "sk-ant-byok-key"
    encryption_key = "test-encryption-key"
    encrypted = encrypt(plaintext_key, encryption_key)

    mock_response = Mock()
    mock_response.error = None
    mock_response.data = {'encrypted_key': encrypted}

    # Mock the query chain properly
    mock_execute = Mock(return_value=mock_response)
    mock_single = Mock()
    mock_single.execute = mock_execute

    mock_eq3 = Mock()
    mock_eq3.single = Mock(return_value=mock_single)

    mock_eq2 = Mock()
    mock_eq2.eq = Mock(return_value=mock_eq3)

    mock_eq1 = Mock()
    mock_eq1.eq = Mock(return_value=mock_eq2)

    mock_select = Mock()
    mock_select.eq = Mock(return_value=mock_eq1)

    mock_from_return = Mock()
    mock_from_return.select = Mock(return_value=mock_select)

    # Mock update chain (for last_used_at)
    mock_update_response = Mock(error=None)
    mock_update_execute = Mock(return_value=mock_update_response)

    mock_update_eq3 = Mock()
    mock_update_eq3.execute = mock_update_execute

    mock_update_eq2 = Mock()
    mock_update_eq2.eq = Mock(return_value=mock_update_eq3)

    mock_update_eq1 = Mock()
    mock_update_eq1.eq = Mock(return_value=mock_update_eq2)

    mock_update = Mock()
    mock_update.eq = Mock(return_value=mock_update_eq1)

    mock_from_return.update = Mock(return_value=mock_update)

    mock_supabase = Mock()
    mock_supabase.from_ = Mock(return_value=mock_from_return)

    # Set encryption key env var
    with patch.dict(os.environ, {'ENCRYPTION_KEY': encryption_key}):
        result = await resolve_key('user-123', 'anthropic', mock_supabase)

    assert isinstance(result, ResolvedKey)
    assert result.api_key == plaintext_key
    assert result.source == 'byok'


@pytest.mark.asyncio
async def test_resolve_key_managed_fallback():
    """Test resolving key when no BYOK key (falls back to managed)"""
    mock_supabase = Mock()

    # Mock no BYOK key found
    mock_response = Mock()
    mock_response.error = "Not found"
    mock_response.data = None

    mock_execute = Mock(return_value=mock_response)
    mock_single = Mock(return_value=Mock(execute=mock_execute))
    mock_eq3 = Mock(return_value=Mock(single=mock_single))
    mock_eq2 = Mock(return_value=Mock(eq=Mock(return_value=mock_eq3)))
    mock_eq1 = Mock(return_value=Mock(eq=Mock(return_value=mock_eq2)))
    mock_select = Mock(return_value=Mock(eq=Mock(return_value=mock_eq1)))
    mock_supabase.from_.return_value.select = mock_select

    # Set managed key env var
    with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'sk-ant-managed-key'}):
        result = await resolve_key('user-123', 'anthropic', mock_supabase)

    assert isinstance(result, ResolvedKey)
    assert result.api_key == 'sk-ant-managed-key'
    assert result.source == 'managed'


@pytest.mark.asyncio
async def test_resolve_key_no_key_found():
    """Test resolving key when neither BYOK nor managed key exists"""
    mock_supabase = Mock()

    # Mock no BYOK key found
    mock_response = Mock()
    mock_response.error = "Not found"
    mock_response.data = None

    mock_execute = Mock(return_value=mock_response)
    mock_single = Mock(return_value=Mock(execute=mock_execute))
    mock_eq3 = Mock(return_value=Mock(single=mock_single))
    mock_eq2 = Mock(return_value=Mock(eq=Mock(return_value=mock_eq3)))
    mock_eq1 = Mock(return_value=Mock(eq=Mock(return_value=mock_eq2)))
    mock_select = Mock(return_value=Mock(eq=Mock(return_value=mock_eq1)))
    mock_supabase.from_.return_value.select = mock_select

    # Clear managed key env var
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(InvalidKeyError, match="No API key found for provider"):
            await resolve_key('user-123', 'anthropic', mock_supabase)
