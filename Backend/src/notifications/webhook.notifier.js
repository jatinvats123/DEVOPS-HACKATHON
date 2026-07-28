import { IncidentEvent } from './notifier.js';
import channelModel from '../models/channel.model.js';
import logger from '../config/logger.js';

/**
 * Webhook / Slack notifier.
 *
 * This channel exists primarily to prove the plug-in seam is real: it was added
 * without touching `incident.service.js` or the incident state machine at all.
 * Slack incoming-webhooks accept the same POST shape, so both channel types are
 * served here.
 */

const TIMEOUT_MS = 5_000;

/** Slack renders `text`; a generic receiver gets the structured fields. */
function buildBody({ event, monitor, incident, occurredAt }) {
  const opened = event === IncidentEvent.OPENED;
  const title = monitor?.title || 'Untitled monitor';

  return {
    text: opened
      ? `🚨 *${title}* is DOWN — ${incident?.reason || 'monitor is down'}`
      : `✅ *${title}* is back UP after ${incident?.duration ?? 0}s`,
    event,
    status: opened ? 'DOWN' : 'UP',
    monitor: {
      id: String(monitor?._id ?? ''),
      title,
      url: monitor?.url,
    },
    incident: {
      id: String(incident?._id ?? ''),
      reason: incident?.reason,
      startedAt: incident?.startTime,
      resolvedAt: incident?.endTime,
      durationSeconds: incident?.duration,
    },
    occurredAt: (occurredAt || new Date()).toISOString(),
  };
}

export const webhookNotifier = {
  name: 'Webhook',

  supports: (event) =>
    event === IncidentEvent.OPENED || event === IncidentEvent.CLOSED,

  async send(payload) {
    const { user } = payload;

    let channels;
    try {
      channels = await channelModel.find({
        userId: user?._id || user?.id,
        type: { $in: ['Webhook', 'Slack'] },
        active: true,
      });
    } catch (err) {
      logger.error(`[notify] could not load webhook channels: ${err.message}`);
      return [];
    }

    // No configured webhooks is the normal case — emit nothing rather than a
    // "Skipped" audit row per incident, which would bury the real entries.
    if (channels.length === 0) return [];

    const body = JSON.stringify(buildBody(payload));

    return Promise.all(
      channels.map(async (channel) => {
        try {
          const response = await fetch(channel.target, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            // A hung receiver must not hold an incident transition open.
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });

          if (!response.ok) {
            return {
              channel: channel.type,
              status: 'Failed',
              target: channel.target,
              detail: `Receiver returned HTTP ${response.status}`,
            };
          }

          return {
            channel: channel.type,
            status: 'Delivered',
            target: channel.target,
          };
        } catch (err) {
          logger.error(
            `[notify] webhook to ${channel.target} failed: ${err.message}`
          );
          return {
            channel: channel.type,
            status: 'Failed',
            target: channel.target,
            detail: err?.message || 'Webhook delivery failed',
          };
        }
      })
    );
  },
};

export default webhookNotifier;
