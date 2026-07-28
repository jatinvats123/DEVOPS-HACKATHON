import { describe, it, expect } from '@jest/globals';
import {
  encryptSecret,
  decryptSecret,
  decryptAuthHeaders,
  hasCredentials,
  isEncryptionConfigured,
} from '../../src/utils/crypto.js';

/**
 * Credential encryption at rest.
 *
 * Outbound monitor credentials are auth headers for customers' internal APIs.
 * Losing them in plaintext is a worse breach than losing our own data, because
 * it pivots an attacker into systems that are not ours.
 */
describe('Secret encryption', () => {
  it('is configured in the test environment', () => {
    expect(isEncryptionConfigured()).toBe(true);
  });

  it('round-trips a secret', () => {
    const secret = 'Bearer super-secret-token';
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it('produces a versioned envelope', () => {
    // The version prefix is what makes key/algorithm rotation possible later
    // without having to guess how any given row was written.
    expect(encryptSecret('x')).toMatch(/^v1:[^:]+:[^:]+:[^:]+$/);
  });

  it('never leaves the plaintext visible in the ciphertext', () => {
    const envelope = encryptSecret('Bearer super-secret-token');
    expect(envelope).not.toContain('super-secret-token');
    expect(envelope).not.toContain('Bearer');
  });

  it('produces a DIFFERENT ciphertext each time for the same input', () => {
    // A fresh random IV per encryption. Deterministic output would leak that
    // two monitors share a credential.
    const a = encryptSecret('same-value');
    const b = encryptSecret('same-value');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it('round-trips unicode and long values intact', () => {
    const secret = `${'x'.repeat(5000)} — ünïcodé 🔐`;
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  describe('tamper detection', () => {
    it('refuses ciphertext whose payload was altered', () => {
      const [version, iv, tag, data] = encryptSecret('original').split(':');
      const flipped = data.startsWith('A')
        ? `B${data.slice(1)}`
        : `A${data.slice(1)}`;

      // GCM is authenticated: tampering fails loudly rather than decrypting to
      // garbage that then gets sent to a customer's endpoint as a header.
      expect(decryptSecret([version, iv, tag, flipped].join(':'))).toBeNull();
    });

    it('refuses ciphertext whose auth tag was altered', () => {
      const [version, iv, tag, data] = encryptSecret('original').split(':');
      const flipped = tag.startsWith('A')
        ? `B${tag.slice(1)}`
        : `A${tag.slice(1)}`;

      expect(decryptSecret([version, iv, flipped, data].join(':'))).toBeNull();
    });

    it('refuses an unknown envelope version', () => {
      const envelope = encryptSecret('original').replace(/^v1:/, 'v99:');
      expect(decryptSecret(envelope)).toBeNull();
    });
  });

  describe('failure tolerance', () => {
    // Returning null rather than throwing means one unreadable row degrades a
    // single monitor's check instead of taking down the scheduler tick.
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['empty string', ''],
      ['garbage', 'not-an-envelope'],
      ['non-string', 12345],
    ])('returns null for %s rather than throwing', (_label, value) => {
      expect(decryptSecret(value)).toBeNull();
    });
  });

  describe('decryptAuthHeaders', () => {
    it('round-trips a header object', () => {
      const headers = { Authorization: 'Bearer abc', 'X-Api-Key': 'xyz' };
      const envelope = encryptSecret(JSON.stringify(headers));
      expect(decryptAuthHeaders(envelope)).toEqual(headers);
    });

    it('returns an empty object when absent', () => {
      expect(decryptAuthHeaders(null)).toEqual({});
    });

    it('returns an empty object when the plaintext is not valid JSON', () => {
      expect(decryptAuthHeaders(encryptSecret('not json at all'))).toEqual({});
    });

    it('returns an empty object when the JSON is not an object', () => {
      expect(decryptAuthHeaders(encryptSecret('"just a string"'))).toEqual({});
    });
  });

  describe('hasCredentials', () => {
    it.each([
      [{ Authorization: 'Bearer x' }, true],
      ['a-string', true],
      [{}, false],
      ['', false],
      ['   ', false],
      [null, false],
      [undefined, false],
    ])('%p -> %p', (value, expected) => {
      expect(hasCredentials(value)).toBe(expected);
    });
  });
});
