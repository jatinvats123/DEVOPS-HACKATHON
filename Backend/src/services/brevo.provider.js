import { config } from '../config/config.js';

/**
 * Brevo transactional email over HTTPS.
 *
 * Exists because SMTP is not always reachable. Render's free web services block
 * outbound traffic on ports 25, 465 and 587, so the SMTP transport fails there
 * no matter how it is configured — the production log line was
 * `connect ENETUNREACH ...:587` followed by `Connection timeout`. This provider
 * talks to port 443, which is not blocked anywhere that can serve HTTP at all.
 *
 * Deliberately built on `fetch` rather than Brevo's SDK: the request is one
 * POST with a JSON body, and a dependency whose only job is to build that
 * object is not worth the supply-chain surface.
 */

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/** Matches the SMTP transport's own budget so callers see one timeout policy. */
const REQUEST_TIMEOUT_MS = 15_000;

export const isBrevoConfigured = () => Boolean(config.BREVO_API_KEY);

/**
 * @param {{email: string, subject: string, message?: string, html?: string}} opts
 * @returns {Promise<{messageId: string}>}
 */
export async function sendViaBrevo({ email, subject, message, html }) {
  if (!config.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not configured');
  }
  if (!config.MAIL_FROM) {
    throw new Error(
      'MAIL_FROM (or SMTP_USER) must be set to a verified sender'
    );
  }

  // AbortController rather than relying on fetch's default: Node's fetch has no
  // timeout at all, so a stalled connection would hold the request open
  // indefinitely — the exact failure the SMTP timeouts were added to prevent.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': config.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: config.MAIL_FROM, name: config.MAIL_FROM_NAME },
        to: [{ email }],
        subject,
        // Brevo requires at least one body field. `htmlContent` is preferred
        // when present; textContent alone is valid for plain messages.
        ...(html ? { htmlContent: html } : {}),
        ...(message ? { textContent: message } : {}),
        ...(html || message ? {} : { textContent: ' ' }),
      }),
      signal: abort.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Brevo request timed out after ${REQUEST_TIMEOUT_MS}ms`, {
        cause: err,
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Brevo returns a JSON body with `code` and `message` on failure. Surfacing
    // it is the difference between "email failed" and "sender not verified" —
    // the latter tells you exactly what to fix in the dashboard.
    const detail = await response
      .json()
      .then((body) => body?.message || body?.code || '')
      .catch(() => response.text().catch(() => ''));
    throw new Error(
      `Brevo rejected the message (HTTP ${response.status})${detail ? `: ${detail}` : ''}`
    );
  }

  const body = await response.json().catch(() => ({}));
  return { messageId: body?.messageId ?? 'unknown' };
}

export default sendViaBrevo;
