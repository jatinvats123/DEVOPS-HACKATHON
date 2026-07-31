import MailTranspoter from '../config/mail.js';
import { config } from '../config/config.js';
import { sendViaBrevo, isBrevoConfigured } from './brevo.provider.js';
import logger from '../config/logger.js';

/**
 * The single outbound-email entry point.
 *
 * Every caller — incident notifications, dispatch tests, password resets — goes
 * through here, so this is where the transport is chosen. Two are supported and
 * the choice is made by configuration, not by branching at each call site:
 *
 *   BREVO_API_KEY set   -> HTTPS on 443
 *   otherwise           -> SMTP on 587
 *
 * The HTTP path is not a preference, it is a requirement on hosts that block
 * SMTP. Render's free web services block outbound 25/465/587, which is why
 * production silently sent nothing while local development worked perfectly:
 * the failure was a blocked port, and the reset endpoint answers 200 whether or
 * not delivery succeeded (deliberately — it must not reveal whether an account
 * exists), so nothing surfaced anywhere a user could see it.
 */

/** Which transport a send would use right now. Exported for /api/health/ready. */
export const activeMailProvider = () =>
  isBrevoConfigured() ? 'brevo' : 'smtp';

export const sendEmail = async ({ email, subject, message, html }) => {
  if (!email) throw new Error('A recipient address is required');

  if (isBrevoConfigured()) {
    const result = await sendViaBrevo({ email, subject, message, html });
    logger.info(
      `[mail] sent via brevo to ${email} (messageId ${result.messageId})`
    );
    return result;
  }

  const mailOptions = {
    // Was hardcoded to `noreply@hackathon.com` — a domain nobody here owns. It
    // only ever appeared to work because Gmail rewrites From to the
    // authenticated account; any receiver checking DMARC alignment would see a
    // mismatch, and an HTTP provider rejects an unverified sender outright.
    from: config.MAIL_FROM
      ? `"${config.MAIL_FROM_NAME}" <${config.MAIL_FROM}>`
      : undefined,
    to: email,
    subject,
    text: message,
    html,
  };

  const info = await MailTranspoter.sendMail(mailOptions);
  logger.info(`[mail] sent via smtp to ${email} (messageId ${info.messageId})`);
  return info;
};

export default sendEmail;
