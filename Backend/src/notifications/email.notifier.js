import { sendEmail } from '../services/sendEmail.js';
import channelModel from '../models/channel.model.js';
import { IncidentEvent } from './notifier.js';
import { incidentOpenedEmail, incidentClosedEmail } from './templates.js';
import logger from '../config/logger.js';

/**
 * Email notifier — the one required channel (incident open and close).
 *
 * Delivers to the account email plus every active `Email` channel the user has
 * configured, de-duplicated so nobody is emailed twice for one transition.
 *
 * Returns one result per recipient rather than throwing, so a single bad
 * address degrades to a `Failed` audit row instead of suppressing delivery to
 * everyone else.
 */
export const emailNotifier = {
  name: 'Email',

  supports: (event) =>
    event === IncidentEvent.OPENED || event === IncidentEvent.CLOSED,

  async send(payload) {
    const { event, user } = payload;

    const { subject, html } =
      event === IncidentEvent.OPENED
        ? incidentOpenedEmail(payload)
        : incidentClosedEmail(payload);

    const recipients = new Set();
    if (user?.email) recipients.add(user.email);

    try {
      const channels = await channelModel.find({
        userId: user?._id || user?.id,
        type: 'Email',
        active: true,
      });
      channels.forEach((c) => c.target && recipients.add(c.target));
    } catch (err) {
      // Extra channels are a bonus; the account email is the guarantee.
      logger.error(`[notify] could not load email channels: ${err.message}`);
    }

    if (recipients.size === 0) {
      return [
        {
          status: 'Skipped',
          detail: 'No email address on file for this account',
        },
      ];
    }

    return Promise.all(
      [...recipients].map(async (target) => {
        try {
          await sendEmail({ email: target, subject, html });
          return { status: 'Delivered', target, detail: 'Incident email' };
        } catch (err) {
          logger.error(`[notify] email to ${target} failed: ${err.message}`);
          return {
            status: 'Failed',
            target,
            detail: err?.message || 'SMTP delivery failed',
          };
        }
      })
    );
  },
};

export default emailNotifier;
