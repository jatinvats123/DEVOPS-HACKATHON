import { describe, it, expect } from '@jest/globals';
import MailTranspoter, { smtpOptions } from '../../src/config/mail.js';

/**
 * SMTP transport configuration.
 *
 * A configuration assertion rather than a behavioural one, because the failure
 * it guards cannot be reproduced in a test: an SMTP host that accepts a
 * connection and then stalls. With nodemailer's defaults that holds the request
 * open for up to ten minutes — long after the browser has abandoned it — while
 * an Express handler and a worker slot wait on nobody.
 *
 * That is exactly what "Test Dispatch" hit. The visible symptom was a client
 * timeout at 10s; the server carried on regardless.
 */
describe('SMTP transport', () => {
  // The shipped options, not the transport's. Under NODE_ENV=test the transport
  // is a local stub, so reading its own options would assert nothing about
  // what production uses.
  const opts = smtpOptions;

  it('never opens a socket under test', () => {
    // Three suites used to send real email on every run. Green in CI only
    // because no credentials were configured there — the wrong reason.
    expect(MailTranspoter.options.jsonTransport).toBe(true);
    expect(MailTranspoter.options.host).toBeUndefined();
  });

  it('reuses connections instead of reconnecting per message', () => {
    // Measured: ~2.5s of a ~4.7s send was DNS + TCP + TLS + AUTH, repeated on
    // every message without this.
    expect(opts.pool).toBe(true);
    expect(opts.maxConnections).toBeGreaterThan(0);
  });

  it('recycles a connection before the provider closes it', () => {
    expect(opts.maxMessages).toBeGreaterThan(0);
    expect(opts.maxMessages).toBeLessThanOrEqual(100);
  });

  it('bounds every phase of the conversation', () => {
    // Nodemailer's defaults are 2min / 30s / 10min. All three must be set:
    // leaving any one unbounded is enough to hang a request indefinitely.
    expect(opts.connectionTimeout).toBeGreaterThan(0);
    expect(opts.greetingTimeout).toBeGreaterThan(0);
    expect(opts.socketTimeout).toBeGreaterThan(0);
  });

  it('gives up before the client does', () => {
    /**
     * The browser allows 30s for the endpoints that send mail (see
     * channel.api.js and auth.api.js). The server must fail first, or the user
     * is shown a timeout for a request the server is still working on — and
     * cannot be told whether the message was sent.
     */
    const CLIENT_BUDGET_MS = 30_000;

    expect(opts.connectionTimeout).toBeLessThan(CLIENT_BUDGET_MS);
    expect(opts.greetingTimeout).toBeLessThan(CLIENT_BUDGET_MS);
    expect(opts.socketTimeout).toBeLessThan(CLIENT_BUDGET_MS);
  });
});
