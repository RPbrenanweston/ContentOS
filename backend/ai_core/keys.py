"""
BYOK key management and resolution

Handles encryption, decryption, storage, and resolution of user API keys.
"""

from typing import Any, Literal


class ResolvedKey:
    """Result of key resolution"""

    def __init__(self, api_key: str, source: Literal['byok', 'managed']):
        self.api_key = api_key
        self.source = source


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
    raise NotImplementedError("resolve_key() will be implemented in S17")


async def save_key(
    user_id: str,
    provider: str,
    api_key: str,
    supabase: Any
) -> None:
    """
    Save (encrypt and store) a BYOK key

    Args:
        user_id: User UUID
        provider: LLM provider
        api_key: Plaintext API key to encrypt and store
        supabase: Supabase client
    """
    raise NotImplementedError("save_key() will be implemented in S17")


async def delete_key(
    user_id: str,
    provider: str,
    supabase: Any
) -> None:
    """
    Delete (deactivate) a BYOK key

    Soft delete: sets is_active=false.

    Args:
        user_id: User UUID
        provider: LLM provider
        supabase: Supabase client
    """
    raise NotImplementedError("delete_key() will be implemented in S17")


async def validate_key(
    provider: str,
    api_key: str
) -> bool:
    """
    Validate that an API key works by making a minimal test call

    Args:
        provider: LLM provider
        api_key: API key to validate

    Returns:
        True if key is valid, False otherwise
    """
    raise NotImplementedError("validate_key() will be implemented in S17")


def encrypt(plaintext: str, encryption_key: str) -> str:
    """
    Encrypt plaintext using AES-256-GCM

    Args:
        plaintext: Data to encrypt
        encryption_key: Encryption key (hashed to 32 bytes)

    Returns:
        Base64-encoded ciphertext with prepended IV and auth tag
    """
    raise NotImplementedError("encrypt() will be implemented in S17")


def decrypt(ciphertext: str, encryption_key: str) -> str:
    """
    Decrypt ciphertext using AES-256-GCM

    Args:
        ciphertext: Base64-encoded ciphertext with IV and auth tag
        encryption_key: Encryption key (hashed to 32 bytes)

    Returns:
        Plaintext data

    Raises:
        InvalidKeyError: If decryption fails (wrong key or tampered data)
    """
    raise NotImplementedError("decrypt() will be implemented in S17")
