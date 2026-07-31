import dotenv from 'dotenv';

dotenv.config();

if (!process.env.PORT) {
  throw new Error('PORT is not defined in environment variables');
}
if (!process.env.MONGO_URL) {
  throw new Error('MONGO_URL is not defined in environment variables');
}
if (!process.env.NODE_ENV) {
  throw new Error('NODE_ENV is not defined in environment variables');
}
if (!process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN is not defined in environment variables');
}
if (!process.env.SMTP_HOST) {
  throw new Error('SMTP_HOST is not defined in environment variables');
}
if (!process.env.SMTP_USER) {
  throw new Error('SMTP_USER is not defined in environment variables');
}
if (!process.env.SMTP_PASS) {
  throw new Error('SMTP_PASS is not defined in environment variables');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}
if (!process.env.JWT_EXPIRY) {
  throw new Error('JWT_EXPIRY is not defined in environment variables');
}
if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL is not defined in environment variables');
}

/**
 * FRONTEND_URL ends up in emailed links, so a wrong value is not a startup
 * problem — it is a link that reaches the user's inbox and then fails in their
 * browser, long after anyone could connect the two.
 *
 * That is exactly how this went wrong: password-reset mail was sent with
 * `http://localhost:5173/reset-password/...`, which is a perfectly good address
 * on the machine that generated it and "This site can't be reached" everywhere
 * else — on a phone, on another device, or once the dev server stops.
 *
 * Validated at boot so the failure lands on whoever changed the configuration
 * rather than on a user holding a dead link.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

let frontendUrl;
try {
  frontendUrl = new URL(process.env.FRONTEND_URL);
} catch {
  throw new Error(
    `FRONTEND_URL is not a valid absolute URL: ${JSON.stringify(process.env.FRONTEND_URL)}. ` +
      'It must include a scheme, e.g. https://example.com'
  );
}

if (
  process.env.NODE_ENV === 'production' &&
  LOOPBACK_HOSTS.has(frontendUrl.hostname)
) {
  // Refused rather than warned: in production every reset link built from this
  // is guaranteed to be unreachable for the person who receives it.
  throw new Error(
    `FRONTEND_URL points at ${frontendUrl.hostname}, which no recipient of an ` +
      'emailed link can reach. Set it to the public address of the deployed app.'
  );
}

/** True when emailed links will only work on the machine that sent them. */
export const frontendUrlIsLoopback = LOOPBACK_HOSTS.has(frontendUrl.hostname);

// Accept a comma-separated list of allowed origins. In development we also
// allow the usual local Vite ports so the dev server can talk to the API.
const parseOrigins = (raw) => {
  const list = String(raw || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    for (const dev of [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5180',
    ]) {
      if (!list.includes(dev)) list.push(dev);
    }
  }
  return list;
};

export const config = {
  // Single source of truth for the auth cookie name — REST middleware and the
  // Socket.IO handshake must read the exact same cookie.
  AUTH_COOKIE: 'uptimeaitoken',
  PORT: process.env.PORT || 3000,
  MONGO_URL: process.env.MONGO_URL,
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  CORS_ORIGINS: parseOrigins(process.env.CORS_ORIGIN),
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  /**
   * Brevo HTTP API key. When set, mail goes over HTTPS instead of SMTP.
   *
   * This exists because Render's free instances block outbound traffic on ports
   * 25, 465 and 587 (their changelog, late September 2025). Nothing in this
   * codebase can make a blocked port connect, and the symptom is invisible:
   * the reset endpoint answers 200 by design, so a user just never receives
   * anything. An HTTP API on 443 is not blocked.
   *
   * Optional. Unset, mail falls back to SMTP, which is correct for local
   * development and for any host that permits SMTP.
   */
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',

  /**
   * Envelope sender.
   *
   * Defaults to SMTP_USER because that is an address we demonstrably control.
   * The previous hardcoded `noreply@hackathon.com` only ever worked because
   * Gmail silently rewrites the From header to the authenticated account; an
   * HTTP provider rejects an unverified sender outright, and any receiver
   * doing SPF/DMARC alignment on a domain we do not own would treat it as
   * forged.
   */
  MAIL_FROM: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'WatchTower',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY,
  FRONTEND_URL: process.env.FRONTEND_URL,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,

  // Encrypts outbound monitor credentials at rest. Optional: without it,
  // monitors simply cannot store auth headers (attempting to do so errors
  // rather than silently writing plaintext). Generate with `openssl rand -hex 32`.
  CREDENTIALS_ENCRYPTION_KEY: process.env.CREDENTIALS_ENCRYPTION_KEY,

  /**
   * Google Sign-In client ID. OPTIONAL — absent means the feature is off.
   *
   * Not a secret: it is embedded in the page by design and identifies the
   * application to Google. It is still required server-side, because verifying
   * an ID token means checking that its `aud` claim equals THIS client id.
   * Without that check any valid Google token — including one minted for an
   * entirely different application — would be accepted, which is the classic
   * way this integration is got wrong.
   *
   * Everything Google-related is conditional on this value: the route, the
   * relaxed CSP, and the button. A deployment that has not configured Google
   * keeps the tighter default policy and shows no dead button.
   */
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',

  // Registration currently marks accounts verified immediately, bypassing the
  // OTP flow. That was a hackathon shortcut and it is a real weakness: combined
  // with cheap signup it allows account spam under arbitrary email addresses.
  //
  // Left ON by default so the existing deployment keeps working, but it is now
  // an explicit, single-variable decision rather than a hardcoded line with a
  // "remove in production" comment next to it. See SECURITY.md.
  AUTO_VERIFY_USERS: process.env.AUTO_VERIFY_USERS !== 'false',
};

if (config.NODE_ENV === 'production' && config.AUTO_VERIFY_USERS) {
  // console rather than the winston logger: config.js is imported by the logger
  // itself, so using it here would be a circular dependency at boot.
  console.warn(
    '[security] AUTO_VERIFY_USERS is enabled in production: new accounts skip email verification. Set AUTO_VERIFY_USERS=false to require it.'
  );
}

if (config.CORS_ORIGINS.includes('*')) {
  // A wildcard cannot be combined with credentialed requests anyway, so this is
  // a misconfiguration that would silently break auth as well as widen access.
  throw new Error(
    'CORS_ORIGIN must be an explicit allow-list; "*" is not permitted'
  );
}

if (config.NODE_ENV === 'production' && config.CORS_ORIGINS.length === 0) {
  throw new Error('CORS_ORIGIN must list at least one origin in production');
}
