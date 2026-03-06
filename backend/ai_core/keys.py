"""
BYOK key management and resolution

Handles encryption, decryption, storage, and resolution of user API keys.
"""

# @crumb
# @id           sal-py-keys-resolver
# @intent       Protect BYOK API keys at rest via AES-256-GCM and resolve correct key source
#               so providers use user-owned keys rather than shared managed keys
# @responsibilities
#               - Encrypt/decrypt BYOK keys with AES-256-GCM (IV+AuthTag+Ciphertext format)
#               - Upsert and soft-delete keys in ai_api_keys table
#               - Validate key liveness via minimal Anthropic API call
#               - Resolve key: BYOK first, managed env var fallback
# @contracts    in: user_id + provider + supabase | out: ResolvedKey(api_key, source)
# @hazards      SHA-256 used as KDF for AES key — no PBKDF2/Argon2, acceptable for env-var
#               secrets but not password-derived keys; last_used_at update is fire-and-forget
#               (synchronous supabase call, errors logged but not raised); resolve_key uses
#               .single() which throws if multiple active keys exist for same user+provider
# @area         SEC
# @trail        chat-flow#2      | Resolve API key (managed or BYOK)
# @trail        byok-flow#1      | Encrypt/decrypt user-provided API keys (AES-256-GCM)
# @refs         backend/ai_core/types.py, packages/ai-core/src/keys.ts
# @prompt       Is SHA-256 key derivation acceptable long-term or should PBKDF2 be added?
# @crumbfn encrypt | AES-256-GCM encrypt; format IV+AuthTag+Ciphertext must match TS decrypt | +L48-L83
# @crumbfn decrypt | AES-256-GCM decrypt; auth tag validation catches tampering | +L86-L128
# @crumbfn save_key | Upsert-based; handles duplicate user+provider via on_conflict | +L131-L173
# @crumbfn resolve_key | BYOK-first resolution with managed env var fallback | +L244-L293

import base64
import hashlib
import os
from typing import Any, Literal
from datetime import datetime, timezone
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from ai_core.types import InvalidKeyError


class ResolvedKey:
    """Result of key resolution"""

    def __init__(self, api_key: str, source: Literal['byok', 'managed']):
        self.api_key = api_key
        self.source = source


def encrypt(plaintext: str, encryption_key: str) -> str:
    """
    Encrypt plaintext using AES-256-GCM

    Format: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext
    Returns base64-encoded string

    Args:
        plaintext: Data to encrypt
        encryption_key: Encryption key (hashed to 32 bytes)

    Returns:
        Base64-encoded ciphertext with prepended IV and auth tag
    """
    # Derive 32-byte key from encryption key (SHA-256 hash)
    key = hashlib.sha256(encryption_key.encode()).digest()

    # Generate random 12-byte IV (recommended for GCM)
    iv = os.urandom(12)

    # Create AESGCM cipher
    aesgcm = AESGCM(key)

    # Encrypt plaintext (returns ciphertext + auth tag combined)
    ciphertext_with_tag = aesgcm.encrypt(iv, plaintext.encode('utf-8'), None)

    # Extract ciphertext and auth tag
    # AESGCM.encrypt returns ciphertext + 16-byte tag appended
    ciphertext = ciphertext_with_tag[:-16]
    auth_tag = ciphertext_with_tag[-16:]

    # Prepend IV and auth tag to ciphertext
    # Format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
    combined = iv + auth_tag + ciphertext

    return base64.b64encode(combined).decode('utf-8')


def decrypt(encrypted_data: str, encryption_key: str) -> str:
    """
    Decrypt ciphertext using AES-256-GCM

    Expects format: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext
    Input must be base64-encoded string

    Args:
        encrypted_data: Base64-encoded ciphertext with IV and auth tag
        encryption_key: Encryption key (hashed to 32 bytes)

    Returns:
        Plaintext data

    Raises:
        InvalidKeyError: If decryption fails (wrong key or tampered data)
    """
    # Derive 32-byte key from encryption key (SHA-256 hash)
    key = hashlib.sha256(encryption_key.encode()).digest()

    # Decode base64
    combined = base64.b64decode(encrypted_data)

    # Extract IV (first 12 bytes)
    iv = combined[:12]

    # Extract auth tag (next 16 bytes)
    auth_tag = combined[12:28]

    # Extract ciphertext (remaining bytes)
    ciphertext = combined[28:]

    # Create AESGCM cipher
    aesgcm = AESGCM(key)

    try:
        # AESGCM.decrypt expects ciphertext + tag combined
        ciphertext_with_tag = ciphertext + auth_tag
        plaintext_bytes = aesgcm.decrypt(iv, ciphertext_with_tag, None)
        return plaintext_bytes.decode('utf-8')
    except Exception:
        # Auth tag validation failed or wrong key
        raise InvalidKeyError('Failed to decrypt: invalid key or tampered data')


async def save_key(
    user_id: str,
    provider: str,
    api_key: str,
    supabase: Any
) -> None:
    """
    Save (encrypt and store) a BYOK key

    Upserts to ai_api_keys table - replaces existing key for same user+provider

    Args:
        user_id: User UUID
        provider: LLM provider
        api_key: Plaintext API key to encrypt and store
        supabase: Supabase client
    """
    # Get encryption key from environment
    encryption_key = os.environ.get('ENCRYPTION_KEY')
    if not encryption_key:
        raise InvalidKeyError('ENCRYPTION_KEY environment variable not set')

    # Encrypt the API key
    encrypted_key = encrypt(api_key, encryption_key)

    # Generate key hint from last 4 characters
    key_hint = f"...{api_key[-4:]}" if len(api_key) >= 4 else api_key

    # Upsert to database (handles duplicate user+provider)
    response = supabase.from_('ai_api_keys').upsert(
        {
            'user_id': user_id,
            'provider': provider,
            'encrypted_key': encrypted_key,
            'key_hint': key_hint,
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
        },
        on_conflict='user_id,provider'
    ).execute()

    if response.error:
        raise Exception(f"Failed to save API key: {response.error.message}")


async def delete_key(
    user_id: str,
    provider: str,
    supabase: Any
) -> None:
    """
    Delete (deactivate) a BYOK key

    Soft delete: sets is_active=false to maintain audit trail

    Args:
        user_id: User UUID
        provider: LLM provider
        supabase: Supabase client
    """
    response = supabase.from_('ai_api_keys').update(
        {'is_active': False}
    ).eq('user_id', user_id).eq('provider', provider).execute()

    if response.error:
        raise Exception(f"Failed to delete API key: {response.error.message}")


async def validate_key(
    provider: str,
    api_key: str
) -> bool:
    """
    Validate that an API key works by making a minimal test call

    Currently supports Anthropic provider only

    Args:
        provider: LLM provider
        api_key: API key to validate

    Returns:
        True if key is valid

    Raises:
        InvalidKeyError: If key is invalid (401)
        Exception: For other errors (network, rate limit, etc.)
    """
    if provider != 'anthropic':
        raise Exception(f"Unsupported provider for validation: {provider}")

    try:
        # Make minimal Anthropic API call to test key validity
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)

        # Use messages.create with minimal parameters to test auth
        client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=1,
            messages=[{'role': 'user', 'content': 'test'}],
        )

        return True
    except Exception as error:
        # Check for 401 (invalid API key)
        if hasattr(error, 'status_code') and error.status_code == 401:
            raise InvalidKeyError('Invalid API key')
        # Other errors (network, rate limit, etc.)
        raise Exception(f"Failed to validate API key: {str(error)}")


async def resolve_key(
    user_id: str,
    provider: str,
    supabase: Any
) -> ResolvedKey:
    """
    Resolve API key for a user and provider

    Checks for active BYOK key first, falls back to managed env var.

    Args:
        user_id: User UUID
        provider: LLM provider (e.g., 'anthropic')
        supabase: Supabase client

    Returns:
        ResolvedKey with api_key and source
    """
    # Check for active BYOK key
    response = supabase.from_('ai_api_keys').select('encrypted_key').eq(
        'user_id', user_id
    ).eq('provider', provider).eq('is_active', True).single().execute()

    user_key = response.data if not response.error else None

    if user_key:
        # Decrypt BYOK key using encryption key from environment
        encryption_key = os.environ.get('ENCRYPTION_KEY')
        if not encryption_key:
            raise InvalidKeyError('ENCRYPTION_KEY environment variable not set')

        decrypted_key = decrypt(user_key['encrypted_key'], encryption_key)

        # Update last_used_at timestamp (fire-and-forget in Python)
        # Note: Python Supabase is synchronous, so we just run it without awaiting
        try:
            supabase.from_('ai_api_keys').update(
                {'last_used_at': datetime.now(timezone.utc).isoformat()}
            ).eq('user_id', user_id).eq('provider', provider).eq('is_active', True).execute()
        except Exception as update_error:
            print(f"Warning: Failed to update last_used_at for BYOK key: {update_error}")

        return ResolvedKey(api_key=decrypted_key, source='byok')

    # Fall back to managed key from environment
    managed_key = os.environ.get(f"{provider.upper()}_API_KEY")
    if not managed_key:
        raise InvalidKeyError(f"No API key found for provider: {provider}")

    return ResolvedKey(api_key=managed_key, source='managed')
