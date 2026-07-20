import channelModel from '../models/channel.model.js';
import notificationLogModel from '../models/notificationLog.model.js';
import { UserService } from './user.service.js';
import { sendEmail } from './sendEmail.js';
import logger from '../config/logger.js';

/**
 * Fan an incident event out to the user's configured alert channels and record
 * every attempt so the Transmission Log shows real history.
 * The account email is sent by incident.service; we log it here.
 */
export async function dispatchToChannels({
  userId,
  monitorId,
  event,
  primaryEmail,
}) {
  try {
    const user = await UserService.findUserById(userId);

    // Respect the user's notification preference
    if (user?.preferences?.incidentAlerts === false) {
      await notificationLogModel.create({
        userId,
        monitorId,
        event,
        channel: 'Email',
        target: primaryEmail,
        status: 'Skipped',
        detail: 'Incident alerts are disabled in preferences',
      });
      return;
    }

    // The account-email dispatch already happened in incident.service
    await notificationLogModel.create({
      userId,
      monitorId,
      event,
      channel: 'Email',
      target: primaryEmail,
      status: 'Delivered',
      detail: 'Account email',
    });

    const channels = await channelModel.find({ userId, active: true });

    for (const ch of channels) {
      // don't email the account address twice
      if (ch.type === 'Email' && ch.target === primaryEmail) continue;

      let status = 'Delivered';
      let detail = '';

      try {
        if (ch.type === 'Email') {
          await sendEmail({
            email: ch.target,
            subject: `WatchTower alert: ${event}`,
            html: `<p><strong>${event}</strong></p>
                   <p>Monitor: ${monitorId}</p>
                   <p>Time: ${new Date().toLocaleString()}</p>`,
          });
        } else {
          status = 'Skipped';
          detail = `${ch.type} delivery is not configured on this deployment`;
        }
      } catch (err) {
        status = 'Failed';
        detail = err?.message || 'Dispatch failed';
        logger.error(`Dispatch to ${ch.type}:${ch.target} failed:`, err);
      }

      await notificationLogModel.create({
        userId,
        monitorId,
        event,
        channel: ch.type,
        target: ch.target,
        status,
        detail,
      });
    }
  } catch (err) {
    // Notification fan-out must never break incident handling
    logger.error('dispatchToChannels failed:', err);
  }
}
