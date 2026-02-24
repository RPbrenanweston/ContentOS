/**
 * Tests for key resolution with BYOK fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveKey, encrypt, decrypt } from '../keys';
import { InvalidKeyError } from '../errors';

describe('resolveKey', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      single: vi.fn(),
      update: vi.fn(() => mockSupabase),
    };

    // Set encryption key environment variable
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
  });

  it('should return BYOK key when active key exists', async () => {
    // Arrange: encrypt a test API key
    const testApiKey = 'sk-ant-api03-test-key';
    const encryptedKey = encrypt(testApiKey, process.env.ENCRYPTION_KEY!);

    // Mock Supabase response with BYOK key
    mockSupabase.single.mockResolvedValue({
      data: { encrypted_key: encryptedKey },
      error: null,
    });

    // Mock update for last_used_at (fire-and-forget, will happen async)
    mockSupabase.update.mockReturnValue(mockSupabase);

    // Act
    const result = await resolveKey('user-123', 'anthropic', mockSupabase);

    // Assert
    expect(result.key).toBe(testApiKey);
    expect(result.source).toBe('byok');

    // Verify query was made correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('ai_api_keys');
    expect(mockSupabase.select).toHaveBeenCalledWith('encrypted_key');
    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mockSupabase.eq).toHaveBeenCalledWith('provider', 'anthropic');
    expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('should return managed key when no BYOK key exists', async () => {
    // Arrange: mock Supabase response with no BYOK key
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: 'No rows found' },
    });

    // Set managed key environment variable
    process.env.ANTHROPIC_API_KEY = 'sk-ant-managed-key';

    // Act
    const result = await resolveKey('user-123', 'anthropic', mockSupabase);

    // Assert
    expect(result.key).toBe('sk-ant-managed-key');
    expect(result.source).toBe('managed');
  });

  it('should update last_used_at when BYOK key is used', async () => {
    // Arrange
    const testApiKey = 'sk-ant-api03-test-key';
    const encryptedKey = encrypt(testApiKey, process.env.ENCRYPTION_KEY!);

    mockSupabase.single.mockResolvedValue({
      data: { encrypted_key: encryptedKey },
      error: null,
    });
    mockSupabase.update.mockReturnValue(mockSupabase);

    // Act
    await resolveKey('user-123', 'anthropic', mockSupabase);

    // Wait for fire-and-forget update to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Assert - update should have been called
    expect(mockSupabase.update).toHaveBeenCalled();
    const updateCall = mockSupabase.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty('last_used_at');
    expect(updateCall.last_used_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp format
  });

  it('should throw InvalidKeyError when ENCRYPTION_KEY not set', async () => {
    // Arrange
    const testApiKey = 'sk-ant-api03-test-key';
    const encryptedKey = encrypt(testApiKey, process.env.ENCRYPTION_KEY!);

    mockSupabase.single.mockResolvedValue({
      data: { encrypted_key: encryptedKey },
      error: null,
    });

    // Remove encryption key
    delete process.env.ENCRYPTION_KEY;

    // Act & Assert
    await expect(
      resolveKey('user-123', 'anthropic', mockSupabase)
    ).rejects.toThrow(InvalidKeyError);
    await expect(
      resolveKey('user-123', 'anthropic', mockSupabase)
    ).rejects.toThrow('ENCRYPTION_KEY environment variable not set');
  });

  it('should throw InvalidKeyError when no managed key found', async () => {
    // Arrange: mock Supabase response with no BYOK key
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: 'No rows found' },
    });

    // Remove managed key
    delete process.env.ANTHROPIC_API_KEY;

    // Act & Assert
    await expect(
      resolveKey('user-123', 'anthropic', mockSupabase)
    ).rejects.toThrow(InvalidKeyError);
    await expect(
      resolveKey('user-123', 'anthropic', mockSupabase)
    ).rejects.toThrow('No API key found for provider: anthropic');
  });

  it('should handle wrong encryption key gracefully', async () => {
    // Arrange: encrypt with one key, decrypt with another
    const testApiKey = 'sk-ant-api03-test-key';
    const correctKey = 'correct-encryption-key';
    const wrongKey = 'wrong-encryption-key';

    const encryptedKey = encrypt(testApiKey, correctKey);

    mockSupabase.single.mockResolvedValue({
      data: { encrypted_key: encryptedKey },
      error: null,
    });

    // Set wrong encryption key
    process.env.ENCRYPTION_KEY = wrongKey;

    // Act & Assert
    await expect(
      resolveKey('user-123', 'anthropic', mockSupabase)
    ).rejects.toThrow(InvalidKeyError);
    await expect(
      resolveKey('user-123', 'anthropic', mockSupabase)
    ).rejects.toThrow('Failed to decrypt: invalid key or tampered data');
  });

  it('should work seamlessly when integrated into chat flow', async () => {
    // Arrange: simulate real usage pattern
    const testApiKey = 'sk-ant-api03-production-key';
    const encryptedKey = encrypt(testApiKey, process.env.ENCRYPTION_KEY!);

    mockSupabase.single.mockResolvedValue({
      data: { encrypted_key: encryptedKey },
      error: null,
    });
    mockSupabase.update.mockReturnValue(mockSupabase);

    // Act: call resolveKey as chat() would
    const resolved = await resolveKey('user-456', 'anthropic', mockSupabase);

    // Assert: key is decrypted and ready to use
    expect(resolved.key).toBe(testApiKey);
    expect(resolved.source).toBe('byok');

    // Verify this key could be passed to Anthropic SDK
    expect(resolved.key).toMatch(/^sk-ant-/);
    expect(resolved.key.length).toBeGreaterThan(20);
  });
});
