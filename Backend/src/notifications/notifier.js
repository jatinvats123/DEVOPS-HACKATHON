/**
 * Notifier contract and registry.
 *
 * The point of this module is that incident logic must never learn how a
 * message is delivered. Previously `incident.service.js` inlined an SMTP call
 * and a 70-line HTML template into the middle of the state machine, so adding
 * Slack meant editing incident handling — and risking incident handling.
 *
 * A notifier is any object satisfying:
 *
 *   {
 *     name: string,
 *     supports(event: string): boolean,
 *     send(payload: NotificationPayload): Promise<NotificationResult>
 *   }
 *
 * @typedef {Object} NotificationPayload
 * @property {'incident.opened'|'incident.closed'} event
 * @property {object} incident  the incident document
 * @property {object} monitor   the monitor document
 * @property {object} user      owner ({ _id, email, username, preferences })
 * @property {Date}   occurredAt
 *
 * @typedef {Object} NotificationResult
 * @property {'Delivered'|'Failed'|'Skipped'} status
 * @property {string} [detail]
 * @property {string} [channel] defaults to the notifier's own name
 * @property {string} [target]  where it was actually sent
 */

import notificationLogModel from '../models/notificationLog.model.js';
import logger from '../config/logger.js';

export const IncidentEvent = {
  OPENED: 'incident.opened',
  CLOSED: 'incident.closed',
};

/** Maps internal events to the labels the Transmission Log UI already renders. */
const EVENT_LABELS = {
  [IncidentEvent.OPENED]: 'CRITICAL_OUTAGE',
  [IncidentEvent.CLOSED]: 'HEALTH_RECOVERY',
};

export class NotifierRegistry {
  constructor() {
    /** @type {Array<{name: string, supports: Function, send: Function}>} */
    this.notifiers = [];
  }

  register(notifier) {
    if (!notifier?.name || typeof notifier.send !== 'function') {
      throw new Error('Notifier must have a name and a send() function');
    }
    if (typeof notifier.supports !== 'function') {
      notifier.supports = () => true;
    }
    // Re-registering the same name replaces it, so tests can swap in a stub
    // without accumulating duplicate senders.
    this.notifiers = this.notifiers.filter((n) => n.name !== notifier.name);
    this.notifiers.push(notifier);
    return this;
  }

  unregister(name) {
    this.notifiers = this.notifiers.filter((n) => n.name !== name);
    return this;
  }

  clear() {
    this.notifiers = [];
    return this;
  }

  list() {
    return this.notifiers.map((n) => n.name);
  }

  /**
   * Fan a notification out to every registered notifier that supports it.
   *
   * Contract, in priority order:
   *  1. Never throws. A broken notifier must not roll back an incident
   *     transition — the incident is the source of truth, delivery is best
   *     effort.
   *  2. Every attempt is recorded in `notificationLog`, including failures and
   *     skips, so "did the customer actually get told?" is answerable.
   *  3. Notifiers run concurrently and are isolated from each other.
   *
   * @param {NotificationPayload} payload
   * @returns {Promise<NotificationResult[]>}
   */
  async dispatch(payload) {
    const { event, user, monitor } = payload;
    const eventLabel = EVENT_LABELS[event] || event;

    // A user-level opt-out short-circuits every channel, and is itself logged
    // so the audit trail explains the silence.
    if (user?.preferences?.incidentAlerts === false) {
      const skipped = {
        status: 'Skipped',
        channel: 'Email',
        target: user?.email,
        detail: 'Incident alerts are disabled in preferences',
      };
      await this.#record(payload, eventLabel, skipped);
      return [skipped];
    }

    const applicable = this.notifiers.filter((n) => n.supports(event));

    const settled = await Promise.allSettled(
      applicable.map(async (notifier) => {
        const outcomes = await notifier.send(payload);
        // A notifier may fan out internally (e.g. several channels); normalise
        // one-or-many into an array.
        return (Array.isArray(outcomes) ? outcomes : [outcomes])
          .filter(Boolean)
          .map((o) => ({ channel: notifier.name, ...o }));
      })
    );

    const results = [];
    settled.forEach((outcome, i) => {
      const notifier = applicable[i];
      if (outcome.status === 'fulfilled') {
        results.push(...outcome.value);
      } else {
        logger.error(
          `[notify] ${notifier.name} threw for ${event} on monitor ${monitor?._id}: ${outcome.reason?.message}`
        );
        results.push({
          channel: notifier.name,
          status: 'Failed',
          detail: outcome.reason?.message || 'Notifier threw',
        });
      }
    });

    await Promise.all(results.map((r) => this.#record(payload, eventLabel, r)));

    return results;
  }

  async #record(payload, eventLabel, result) {
    try {
      await notificationLogModel.create({
        userId: payload.user?._id || payload.user?.id,
        monitorId: payload.monitor?._id,
        event: eventLabel,
        channel: result.channel || 'Email',
        target: result.target,
        status: result.status,
        detail: result.detail,
      });
    } catch (err) {
      // Losing an audit row must not escalate into losing the notification.
      logger.error(
        `[notify] failed to record notification log: ${err.message}`
      );
    }
  }
}

/** Process-wide registry. Populated in notifications/index.js. */
export const notifierRegistry = new NotifierRegistry();

export default notifierRegistry;
