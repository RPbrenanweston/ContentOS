/**
 * Tests for AES-256-GCM encryption/decryption
 */

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../keys';
import { InvalidKeyError } from '../errors';

describe('AES-256-GCM encryption', () => {
  const testKey = 'test-encryption-key-for-testing-32-bytes-minimum';
  const testPlaintext = 'sk-ant-api03-test-key-1234567890abcdef';

  it('should encrypt plaintext to base64 string', () => {
    const encrypted = encrypt(testPlaintext, testKey);

    // Encrypted output should be base64
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(testPlaintext);

    // Base64 string should decode to buffer
    const buffer = Buffer.from(encrypted, 'base64');
    expect(buffer.length).toBeGreaterThan(28); // IV (12) + Tag (16) + ciphertext
  });

  it('should decrypt ciphertext back to original plaintext', () => {
    const encrypted = encrypt(testPlaintext, testKey);
    const decrypted = decrypt(encrypted, testKey);

    expect(decrypted).toBe(testPlaintext);
  });

  it('should produce different ciphertext each time (random IV)', () => {
    const encrypted1 = encrypt(testPlaintext, testKey);
    const encrypted2 = encrypt(testPlaintext, testKey);

    // Different IVs mean different ciphertext
    expect(encrypted1).not.toBe(encrypted2);

    // But both decrypt to same plaintext
    expect(decrypt(encrypted1, testKey)).toBe(testPlaintext);
    expect(decrypt(encrypted2, testKey)).toBe(testPlaintext);
  });

  it('should throw InvalidKeyError on wrong decryption key', () => {
    const encrypted = encrypt(testPlaintext, testKey);
    const wrongKey = 'wrong-encryption-key';

    expect(() => {
      decrypt(encrypted, wrongKey);
    }).toThrow(InvalidKeyError);

    expect(() => {
      decrypt(encrypted, wrongKey);
    }).toThrow('Failed to decrypt: invalid key or tampered data');
  });

  it('should detect tampered ciphertext (auth tag validation)', () => {
    const encrypted = encrypt(testPlaintext, testKey);

    // Tamper with the ciphertext (flip a bit in the encrypted data)
    const buffer = Buffer.from(encrypted, 'base64');
    buffer[30] ^= 0x01; // Flip one bit in ciphertext region
    const tampered = buffer.toString('base64');

    expect(() => {
      decrypt(tampered, testKey);
    }).toThrow(InvalidKeyError);
  });

  it('should handle empty string encryption/decryption', () => {
    const encrypted = encrypt('', testKey);
    const decrypted = decrypt(encrypted, testKey);

    expect(decrypted).toBe('');
  });

  it('should handle long plaintext (2KB API key)', () => {
    const longPlaintext = 'sk-ant-' + 'a'.repeat(2000);
    const encrypted = encrypt(longPlaintext, testKey);
    const decrypted = decrypt(encrypted, testKey);

    expect(decrypted).toBe(longPlaintext);
  });

  it('should handle special characters in plaintext', () => {
    const specialPlaintext = 'key-with-émojis-🔑-and-spëcial-çhars-™';
    const encrypted = encrypt(specialPlaintext, testKey);
    const decrypted = decrypt(encrypted, testKey);

    expect(decrypted).toBe(specialPlaintext);
  });

  it('should roundtrip multiple times without corruption', () => {
    let current = testPlaintext;

    // Encrypt and decrypt 10 times
    for (let i = 0; i < 10; i++) {
      const encrypted = encrypt(current, testKey);
      current = decrypt(encrypted, testKey);
    }

    expect(current).toBe(testPlaintext);
  });
});
