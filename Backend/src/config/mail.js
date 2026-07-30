import nodemailer from 'nodemailer';
import { config } from './config.js';

/**
 * SMTP transport options.
 *
 * Exported separately from the transport so they can be asserted on directly.
 * Under NODE_ENV=test the transport itself is a local stub (see below), so
 * reading `transport.options` there would describe the stub rather than the
 * configuration that actually ships.
 *
 * Two properties this needs and did not have: it must REUSE connections, and it
 * must be bounded in time.
 *
 * Measured against smtp.gmail.com from a developer machine, a single send took
 * ~4.7s, of which ~2.5s was DNS + TCP + TLS + AUTH — paid again on every
 * message, because a transport without `pool` opens a fresh connection each
 * time. "Test Dispatch" therefore spent roughly half the browser's 10s budget
 * before anything had been sent, and exceeded it entirely from slower networks.
 *
 * The timeouts matter more than the speed. Nodemailer's defaults are 2 minutes
 * to connect, 30s for a greeting and 10 minutes of socket idle, so an SMTP host
 * that accepts a connection and then stalls holds the request open for minutes
 * after the browser has given up — an Express handler and a worker slot, both
 * waiting on something nobody is listening for any more. Bounded below the
 * client budget, a stall becomes a prompt, reportable error instead.
 */
export const smtpOptions = {
  host: config.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },

  // Reuse connections across sends. The scheduler can emit several incident
  // notifications at once, and without this each one re-runs the full TLS and
  // AUTH handshake.
  pool: true,
  maxConnections: 3,
  // Providers drop connections that carry too many messages; recycling well
  // before that limit is cheaper than discovering it during an incident.
  maxMessages: 50,

  // Bounded, and deliberately smaller than the client-side budget so the API
  // answers with a real error rather than the browser timing out first.
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 15000,
};

/**
 * Tests must never reach a real mail server.
 *
 * Three suites were sending genuine email to whatever address SMTP_USER names,
 * every run, and taking 30-45s to do it. They passed in CI only because no SMTP
 * credentials are configured there, so every send failed immediately — the
 * suite was green for the wrong reason, and slow-to-failing on any machine
 * where the credentials were real.
 *
 * `jsonTransport` serialises the message and resolves, touching no network. It
 * is nodemailer's own facility for exactly this, so the calling code, the
 * error handling around it and the message construction are all still
 * exercised — only the socket is gone.
 */
const MailTranspoter =
  config.NODE_ENV === 'test'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport(smtpOptions);

export default MailTranspoter;
