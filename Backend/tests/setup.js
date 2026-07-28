import { jest } from '@jest/globals';

/**
 * Global test environment.
 *
 * Every value here is set BEFORE any application module is imported, because
 * config.js validates required variables at import time and throws if any are
 * missing. Tests must never depend on a developer's local .env.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '4000';
process.env.MONGO_URL =
  process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/test';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = 'test-jwt-secret-not-used-anywhere-real';
process.env.JWT_EXPIRY = '1d';
process.env.FRONTEND_URL = 'http://localhost:5173';

// SMTP is required by config.js but never contacted: the notifier registry is
// swapped for a stub in any test that triggers a notification.
process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_USER = 'test@example.test';
process.env.SMTP_PASS = 'not-a-real-password';

// A real 32-byte key so the encryption tests exercise the actual cipher path
// rather than the scrypt fallback.
process.env.CREDENTIALS_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// AI is optional and must never be contacted from a test.
process.env.MISTRAL_API_KEY = '';

// The scheduler is driven explicitly by the tests that need it; it must never
// start its own timer loop and make results depend on wall-clock timing.
process.env.SCHEDULER_ENABLED = 'false';

jest.setTimeout(30_000);
