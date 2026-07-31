import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * The host in an emailed reset link.
 *
 * A wrong FRONTEND_URL does not fail at startup and does not fail the request.
 * It produces a 200, a delivered email, and a link that dies in the recipient's
 * browser with "This site can't be reached" — a symptom that appears on a
 * different device, minutes later, with nothing tying it back to the cause.
 *
 * Real reset mail went out pointing at `http://localhost:5173/reset-password/…`,
 * which is a valid address on the machine that generated it and unreachable
 * from anywhere else. These cases make that impossible to ship.
 *
 * config.js reads the environment at import, so each case re-imports it.
 */

const originalEnv = { ...process.env };

const loadConfig = async () => {
  const { jest } = await import('@jest/globals');
  jest.resetModules();
  return import('../../src/config/config.js');
};

describe('FRONTEND_URL validation', () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://watchtower.example.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('accepts a public https address', async () => {
    const { config, frontendUrlIsLoopback } = await loadConfig();
    expect(config.FRONTEND_URL).toBe('https://watchtower.example.com');
    expect(frontendUrlIsLoopback).toBe(false);
  });

  it('rejects a value that is not an absolute URL', async () => {
    // `watchtower.example.com` with no scheme parses as neither a URL nor an
    // origin, and would concatenate into a link no mail client can open.
    process.env.FRONTEND_URL = 'watchtower.example.com';
    await expect(loadConfig()).rejects.toThrow(/valid absolute URL/i);
  });

  it('refuses a loopback address in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    // Refused rather than warned: in production every link built from this is
    // guaranteed dead for whoever receives it.
    await expect(loadConfig()).rejects.toThrow(/localhost/);
  });

  it('refuses 127.0.0.1 in production too', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'http://127.0.0.1:8000';
    await expect(loadConfig()).rejects.toThrow(/127\.0\.0\.1/);
  });

  it('allows loopback outside production but flags it', async () => {
    process.env.NODE_ENV = 'development';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    // Legitimate locally; the flag is what lets the reset path warn instead of
    // silently mailing a link only the developer's own browser can open.
    const { frontendUrlIsLoopback } = await loadConfig();
    expect(frontendUrlIsLoopback).toBe(true);
  });
});

describe('The emailed reset link', () => {
  let sendEmail;
  let app;
  let request;
  let helpers;

  /**
   * Build the app against a given FRONTEND_URL.
   *
   * The value has to be in place BEFORE config.js is imported, and the module
   * registry has to be reset for that to take — which also resets mongoose, so
   * the database connection is established after, not before. Doing this
   * mid-test instead left the fresh mongoose unconnected and every write
   * buffered until it timed out.
   */
  const setupWith = async (frontendUrl) => {
    const { jest } = await import('@jest/globals');
    jest.resetModules();
    process.env.FRONTEND_URL = frontendUrl;

    sendEmail = jest.fn().mockResolvedValue({ messageId: 'test' });
    jest.unstable_mockModule('../../src/services/sendEmail.js', () => ({
      sendEmail,
      activeMailProvider: () => 'smtp',
    }));

    request = (await import('supertest')).default;
    app = (await import('../../src/app.js')).default;
    helpers = await import('../helpers/db.js');
    const { resetRateLimits } = await import('../../src/app.middleware.js');

    await helpers.connectTestDb();
    await helpers.clearTestDb();
    resetRateLimits();
  };

  beforeEach(() => setupWith('https://watchtower.example.com'));

  afterEach(async () => {
    await helpers.disconnectTestDb();
    process.env = { ...originalEnv };
  });

  const linkFrom = () => {
    const call = sendEmail.mock.calls.at(-1)?.[0] ?? {};
    return `${call.message ?? ''} ${call.html ?? ''}`.match(
      /https?:\/\/\S*?\/reset-password\/[a-f0-9]{64}/
    )?.[0];
  };

  const requestReset = async () => {
    const { createUser } = await import('../helpers/factories.js');
    await createUser({ email: 'linkcheck@example.test' });
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'linkcheck@example.test' })
      .expect(200);
  };

  it('uses the configured public host', async () => {
    await requestReset();
    const link = linkFrom();

    expect(link).toBeDefined();
    expect(
      link.startsWith('https://watchtower.example.com/reset-password/')
    ).toBe(true);
  });

  it('never emits a loopback host when one is not configured', async () => {
    await requestReset();
    expect(linkFrom()).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it('does not double the slash when FRONTEND_URL has a trailing one', async () => {
    // A trailing slash is an easy thing to paste into a dashboard, and
    // `//reset-password` is a protocol-relative path in some clients.
    await helpers.disconnectTestDb();
    await setupWith('https://watchtower.example.com/');

    await requestReset();
    const link = linkFrom();

    expect(link).toBeDefined();
    expect(link).not.toMatch(/com\/\/reset-password/);
    expect(
      link.startsWith('https://watchtower.example.com/reset-password/')
    ).toBe(true);
  });

  it('points at a route the SPA actually serves', async () => {
    await requestReset();
    const path = new URL(linkFrom()).pathname;

    // The link previously pointed at /api/auth/reset-password/:token, a
    // POST-only API route, so a mail client's GET could never work. This pins
    // the path shape the router has a page for.
    expect(path).toMatch(/^\/reset-password\/[a-f0-9]{64}$/);
    expect(path).not.toMatch(/^\/api\//);
  });
});
