import crypto from 'node:crypto';
import { config } from '../config/config.js';
import logger from '../config/logger.js';

/**
 * Envelope encryption for secrets stored at rest.
 *
 * Used for outbound monitor credentials: a monitored endpoint behind auth needs
 * an `Authorization` header, and storing that in plaintext would mean a single
 * database dump hands an attacker working credentials to every customer's
 * internal APIs. That is a strictly worse breach than losing our own data.
 *
 * AES-256-GCM, chosen for authentication as well as confidentiality: GCM's auth
 * tag means tampered ciphertext fails loudly instead of decrypting to garbage
 * that then gets sent to a customer's endpoint as a header.
 *
 * Format: v1:<iv-b64>:<authTag-b64>:<ciphertext-b64>
 * The version prefix exists so the key or algorithm can be rotated later
 * without having to guess how any given row was written.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, the size GCM is specified for
const VERSION = 'v1';

let cachedKey = null;

/**
 * Derive the 32-byte key from CREDENTIALS_ENCRYPTION_KEY.
 *
 * Accepts either 64 hex characters (a real 256-bit key) or an arbitrary
 * passphrase, which is stretched with scrypt. The hex form is strongly
 * preferred; the passphrase path exists so a misconfigured deployment degrades
 * to "weaker key" rather than "crashes on boot".
 */
function getKey() {
  if (cachedKey) return cachedKey;

  const raw = config.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) return null;

  if (/^[0-9a-f]{64}$/i.test(raw)) {
    cachedKey = Buffer.from(raw, 'hex');
  } else {
    // Fixed salt: this must be deterministic across restarts and instances or
    // yesterday's ciphertext becomes undecryptable. The salt is not the secret.
    cachedKey = crypto.scryptSync(raw, 'watchtower-credentials-v1', 32);
    logger.warn(
      '[crypto] CREDENTIALS_ENCRYPTION_KEY is not 64 hex chars; deriving via scrypt. Generate a proper key with: openssl rand -hex 32'
    );
  }
  return cachedKey;
}

export const isEncryptionConfigured = () => Boolean(getKey());

/** True when the value actually carries something worth encrypting. */
export function hasCredentials(value) {
  if (!value) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

/**
 * @param {string} plaintext
 * @returns {string} the encoded envelope
 * @throws if no key is configured — silently storing plaintext under a field
 *   named "encrypted" would be worse than refusing.
 */
export function encryptSecret(plaintext) {
  const key = getKey();
  if (!key) {
    throw new Error(
      'Cannot store credentials: CREDENTIALS_ENCRYPTION_KEY is not configured'
    );
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * @param {string} envelope
 * @returns {string|null} plaintext, or null if it cannot be decrypted
 *
 * Returns null rather than throwing so a single unreadable row (rotated key,
 * corrupted value) degrades one monitor's check instead of taking down the
 * scheduler tick that was processing it.
 */
export function decryptSecret(envelope) {
  const key = getKey();
  if (!key || !envelope || typeof envelope !== 'string') return null;

  try {
    const [version, ivB64, tagB64, dataB64] = envelope.split(':');
    if (version !== VERSION) {
      logger.error(`[crypto] unknown envelope version: ${version}`);
      return null;
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch (err) {
    // Includes the GCM auth-tag failure, i.e. the ciphertext was tampered with.
    logger.error(`[crypto] decryption failed: ${err.message}`);
    return null;
  }
}

/**
 * Decrypt a monitor's stored auth headers back into a plain object.
 * @returns {object} empty when absent or undecryptable
 */
export function decryptAuthHeaders(envelope) {
  const plaintext = decryptSecret(envelope);
  if (!plaintext) return {};
  try {
    const parsed = JSON.parse(plaintext);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    logger.error('[crypto] stored auth headers are not valid JSON');
    return {};
  }
}

export default {
  encryptSecret,
  decryptSecret,
  decryptAuthHeaders,
  hasCredentials,
  isEncryptionConfigured,
};
