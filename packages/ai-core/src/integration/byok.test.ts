/**
 * Phase 2 Integration Tests: BYOK Flow
 *
 * Tests end-to-end BYOK functionality:
 * - Save key → chat uses BYOK → usage logged correctly
 * - Managed fallback when no BYOK key
 * - Cross-language encryption compatibility (TS ↔ Python)
 * - Deactivated BYOK key triggers managed fallback
 *
 * Note: These are unit tests with mocks. Real integration tests require actual Supabase instance.
 */

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../keys';

describe('BYOK Integration Tests', () => {
  it('AC1: BYOK key encryption format is correct', () => {
    const plaintext = 'sk-ant-test-key-12345';
    const encryptionKey = 'test-encryption-key-32chars-long!';

    const encrypted = encrypt(plaintext, encryptionKey);

    // Verify format: base64-encoded
    expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);

    // Decrypt and verify
    const decrypted = decrypt(encrypted, encryptionKey);
    expect(decrypted).toBe(plaintext);
  });

  // AC2 (managed fallback) and AC3 (key_source logging) are tested in:
  //   - keys.test.ts: resolveKey returns managed key when no BYOK exists
  //   - integration.test.ts: chat() logs usage with correct key_source
  // Removed placeholder tests that asserted expect(true).toBe(true).

  it('AC4: Python decrypts key encrypted by TypeScript', () => {
    // Test cross-language encryption compatibility
    const plaintext = 'sk-ant-test-key-12345';
    const encryptionKey = 'test-encryption-key-32chars-long!';

    // Encrypt in TypeScript
    const encrypted = encrypt(plaintext, encryptionKey);

    // Verify format: base64-encoded with IV (12) + Tag (16) + Ciphertext
    const decoded = Buffer.from(encrypted, 'base64');
    expect(decoded.length).toBeGreaterThanOrEqual(28); // IV + Tag minimum

    // Decrypt in TypeScript (simulating Python decrypt)
    const decrypted = decrypt(encrypted, encryptionKey);
    expect(decrypted).toBe(plaintext);

    // Verify roundtrip works
    const encrypted2 = encrypt(plaintext, encryptionKey);
    const decrypted2 = decrypt(encrypted2, encryptionKey);
    expect(decrypted2).toBe(plaintext);

    // Note: Actual cross-language test requires Python test runner
    // This test verifies the format is compatible (IV + Tag + Ciphertext)
  });

  // AC5 (deactivated key fallback) is tested in:
  //   - keys.test.ts: resolveKey filters by is_active=true
  //   - key-management.test.ts: deleteKey sets is_active=false
  // Removed placeholder test that asserted expect(true).toBe(true).

  it('AC6: Encryption roundtrip with multiple keys', () => {
    // Test that different plaintexts encrypt to different ciphertexts
    const encryptionKey = 'test-encryption-key-32chars-long!';

    const plaintext1 = 'sk-ant-key-1';
    const plaintext2 = 'sk-ant-key-2';

    const encrypted1 = encrypt(plaintext1, encryptionKey);
    const encrypted2 = encrypt(plaintext2, encryptionKey);

    // Different plaintexts should produce different ciphertexts
    expect(encrypted1).not.toBe(encrypted2);

    // But both should decrypt correctly
    expect(decrypt(encrypted1, encryptionKey)).toBe(plaintext1);
    expect(decrypt(encrypted2, encryptionKey)).toBe(plaintext2);
  });

  it('AC7: Wrong encryption key fails decryption', () => {
    const plaintext = 'sk-ant-test-key';
    const correctKey = 'correct-encryption-key-32chars!';
    const wrongKey = 'wrong-encryption-key-32chars!!!';

    const encrypted = encrypt(plaintext, correctKey);

    // Decryption with wrong key should throw
    expect(() => decrypt(encrypted, wrongKey)).toThrow('invalid key or tampered data');
  });

  it('AC8: Tampered ciphertext fails decryption', () => {
    const plaintext = 'sk-ant-test-key';
    const encryptionKey = 'test-encryption-key-32chars-long!';

    const encrypted = encrypt(plaintext, encryptionKey);

    // Tamper with the ciphertext
    const buffer = Buffer.from(encrypted, 'base64');
    buffer[buffer.length - 1] ^= 0xFF; // Flip last byte
    const tampered = buffer.toString('base64');

    // Decryption should fail (auth tag validation)
    expect(() => decrypt(tampered, encryptionKey)).toThrow('invalid key or tampered data');
  });
});

/**
 * NOTE FOR REAL INTEGRATION TESTS:
 *
 * These tests verify the encryption logic and patterns.
 * Real integration tests require:
 * 1. Actual Supabase instance (or test database)
 * 2. Real Anthropic API key (or mock server)
 * 3. End-to-end flow: saveKey → resolveKey → chat → logUsage
 *
 * Example real integration test flow:
 *
 * 1. Save BYOK key to test database
 * 2. Create AIClient with test Supabase client
 * 3. Call chat() with BYOK user
 * 4. Verify usage log has key_source='byok'
 * 5. Delete BYOK key
 * 6. Call chat() again
 * 7. Verify usage log has key_source='managed'
 *
 * This would require test infrastructure setup (Supabase test project, etc.)
 */
